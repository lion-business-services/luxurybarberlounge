import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { addDays, dateInZone, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { calculateCommission } from "@/lib/commissions/engine";
import { businessConfig } from "@/lib/config/business";
import { squareRequest } from "@/lib/square/client";
import { squareConfig } from "@/lib/square/config";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;
type Json = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function localized(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Json;
    if (typeof record.en === "string" && record.en.trim()) return record.en.trim();
    if (typeof record.es === "string" && record.es.trim()) return record.es.trim();
  }
  return fallback;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "Guest", lastName: parts.slice(1).join(" ") };
}

function settlementWindow(reference: Date) {
  const localDate = dateInZone(reference, businessConfig.timezone);
  const weekday = weekdayForDate(localDate);
  const daysBack = weekday === 0 ? 6 : weekday - 1;
  const monday = addDays(localDate, -daysBack);
  const nextMonday = addDays(monday, 7);
  return {
    start: zonedDateTimeToUtc(monday, "00:00:00", businessConfig.timezone),
    end: zonedDateTimeToUtc(nextMonday, "00:00:00", businessConfig.timezone),
    label: `${monday} to ${addDays(nextMonday, -1)}`,
  };
}

async function ensureSettlementPeriod(admin: AdminClient, businessId: string, locationId: string | null, paidAt: string) {
  const window = settlementWindow(new Date(paidAt));
  const { data, error } = await admin.from("settlement_periods").upsert({
    business_id: businessId,
    location_id: locationId,
    label: window.label,
    starts_at: window.start.toISOString(),
    ends_at: window.end.toISOString(),
    review_deadline: new Date(window.end.getTime() + 24 * 60 * 60_000).toISOString(),
    status: "open",
  }, { onConflict: "business_id,location_id,starts_at,ends_at" }).select("id").single();
  if (error || !data?.id) throw error ?? new Error("Settlement period could not be prepared.");
  return String(data.id);
}

async function latestAssignment(admin: AdminClient, queueEntryId: string) {
  const { data } = await admin.from("queue_assignments")
    .select("barber_user_id,assigned_at")
    .eq("queue_entry_id", queueEntryId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.barber_user_id) return { barberUserId: null, barberProfileId: null };
  const barberUserId = String(data.barber_user_id);
  const { data: profile } = await admin.from("barber_profiles")
    .select("id,staff_user_id,display_name")
    .eq("staff_user_id", barberUserId)
    .maybeSingle();
  return {
    barberUserId,
    barberProfileId: profile?.id ? String(profile.id) : null,
  };
}

async function ensureClientRecord(admin: AdminClient, businessId: string, queue: Json) {
  const email = text(queue.client_email)?.toLowerCase() ?? null;
  const phone = text(queue.client_phone);
  const authUserId = text(queue.client_id);
  let existing: Json | null = null;

  if (authUserId) {
    const result = await admin.from("clients").select("id,auth_user_id,square_customer_id,first_name,last_name,email,phone,created_at")
      .eq("business_id", businessId).eq("auth_user_id", authUserId).maybeSingle();
    existing = result.data as Json | null;
  }
  if (!existing && email) {
    const result = await admin.from("clients").select("id,auth_user_id,square_customer_id,first_name,last_name,email,phone,created_at")
      .eq("business_id", businessId).eq("email", email).neq("status", "merged").order("created_at").limit(1).maybeSingle();
    existing = result.data as Json | null;
  }
  if (!existing && phone) {
    const result = await admin.from("clients").select("id,auth_user_id,square_customer_id,first_name,last_name,email,phone,created_at")
      .eq("business_id", businessId).eq("phone", phone).neq("status", "merged").order("created_at").limit(1).maybeSingle();
    existing = result.data as Json | null;
  }

  const verifiedExisting = Boolean(existing?.id);
  if (!existing?.id) {
    const name = splitName(text(queue.client_name) ?? "Guest");
    const { data, error } = await admin.from("clients").insert({
      business_id: businessId,
      auth_user_id: authUserId,
      first_name: name.firstName,
      last_name: name.lastName,
      email,
      phone,
      acquisition_source: "walk_in",
      status: "active",
      metadata: { createdFrom: "walk_in_queue", queueEntryId: queue.id },
    }).select("id,auth_user_id,square_customer_id,first_name,last_name,email,phone,created_at").single();
    if (error || !data?.id) throw error ?? new Error("Client record could not be prepared.");
    existing = data as Json;
  }

  await admin.from("queue_entries").update({ client_record_id: existing.id }).eq("id", queue.id);
  return { client: existing, verifiedExisting };
}

async function ensureSquareCustomer(admin: AdminClient, client: Json, queue: Json) {
  const existingId = text(client.square_customer_id);
  if (existingId) return existingId;

  const email = text(client.email)?.toLowerCase() ?? text(queue.client_email)?.toLowerCase() ?? null;
  const phone = text(client.phone) ?? text(queue.client_phone);
  let foundId: string | null = null;

  if (email) {
    try {
      const searched = await squareRequest<{ customers?: Array<{ id?: string; email_address?: string }> }>("/v2/customers/search", {
        method: "POST",
        body: { query: { filter: { email_address: { exact: email } } }, limit: 10 },
      });
      const exact = (searched.customers ?? []).filter((customer) => customer.email_address?.toLowerCase() === email);
      if (exact.length === 1 && exact[0]?.id) foundId = exact[0].id;
    } catch {
      // A customer search failure should not create a duplicate immediately.
    }
  }

  if (!foundId) {
    const name = splitName(text(queue.client_name) ?? `${text(client.first_name) ?? "Guest"} ${text(client.last_name) ?? ""}`);
    const baseBody: Json = {
      given_name: name.firstName,
      family_name: name.lastName || undefined,
      email_address: email ?? undefined,
      phone_number: phone ?? undefined,
      reference_id: `LBL-${String(client.id).slice(0, 36)}`,
      note: `Luxury Barber Lounge walk-in client · ${text(queue.client_name) ?? "Guest"}`,
    };
    try {
      const created = await squareRequest<{ customer?: { id?: string } }>("/v2/customers", {
        method: "POST",
        body: baseBody,
        idempotencyKey: `walkin-customer-${client.id}`,
      });
      foundId = created.customer?.id ?? null;
    } catch {
      const created = await squareRequest<{ customer?: { id?: string } }>("/v2/customers", {
        method: "POST",
        body: { ...baseBody, phone_number: undefined },
        idempotencyKey: `walkin-customer-${client.id}-email`,
      });
      foundId = created.customer?.id ?? null;
    }
  }

  if (!foundId) throw new Error("Square customer profile could not be prepared.");
  await admin.from("clients").update({ square_customer_id: foundId }).eq("id", client.id);
  return foundId;
}

async function commissionAttribution(admin: AdminClient, businessId: string, client: Json, queue: Json, barberUserId: string, verifiedExisting: boolean) {
  let row: Json | null = null;
  const authId = text(client.auth_user_id);
  const email = text(client.email)?.toLowerCase() ?? text(queue.client_email)?.toLowerCase() ?? null;
  const phone = text(client.phone) ?? text(queue.client_phone);

  if (authId) {
    const result = await admin.from("client_barber_attributions")
      .select("attribution,source,evidence_summary,rule_version_id,effective_from")
      .eq("business_id", businessId).eq("client_user_id", authId).eq("barber_user_id", barberUserId)
      .lte("effective_from", new Date().toISOString()).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    row = result.data as Json | null;
  }
  if (!row && email) {
    const result = await admin.from("client_barber_attributions")
      .select("attribution,source,evidence_summary,rule_version_id,effective_from")
      .eq("business_id", businessId).eq("client_external_ref", email).eq("barber_user_id", barberUserId)
      .lte("effective_from", new Date().toISOString()).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    row = result.data as Json | null;
  }
  if (!row && phone) {
    const result = await admin.from("client_barber_attributions")
      .select("attribution,source,evidence_summary,rule_version_id,effective_from")
      .eq("business_id", businessId).eq("client_external_ref", phone).eq("barber_user_id", barberUserId)
      .lte("effective_from", new Date().toISOString()).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    row = result.data as Json | null;
  }

  if (text(row?.attribution) === "BARBER") {
    return { type: "BARBER" as const, source: text(row?.source) ?? "verified_pre_existing", evidence: (row?.evidence_summary as Json | undefined) ?? {}, ruleVersionId: text(row?.rule_version_id) };
  }
  if (verifiedExisting) {
    return { type: "BARBER" as const, source: "verified_existing_client_record", evidence: { clientRecordId: client.id, verifiedBeforePayment: true }, ruleVersionId: null };
  }
  return { type: "SHOP" as const, source: "new_walk_in", evidence: { clientRecordId: client.id, verifiedExisting: false }, ruleVersionId: null };
}

async function activeCommissionRule(admin: AdminClient, businessId: string, attribution: "BARBER" | "SHOP") {
  const base = admin.from("commission_rule_versions")
    .select("id,version,barber_rate,shop_rate,tips_to_barber,include_discounts,include_taxes,include_processing_fees,attribution_type,priority,commission_rules!inner(active,business_id)")
    .eq("commission_rules.business_id", businessId)
    .eq("commission_rules.active", true)
    .lte("effective_from", new Date().toISOString());
  const exact = attribution === "BARBER"
    ? await base.eq("attribution_type", "BARBER").order("priority").limit(1).maybeSingle()
    : await base.is("attribution_type", null).order("priority").limit(1).maybeSingle();
  if (exact.data?.id) return exact.data;
  const fallback = await admin.from("commission_rule_versions")
    .select("id,version,barber_rate,shop_rate,tips_to_barber,include_discounts,include_taxes,include_processing_fees,attribution_type,priority,commission_rules!inner(active,business_id)")
    .eq("commission_rules.business_id", businessId).eq("commission_rules.active", true)
    .lte("effective_from", new Date().toISOString()).order("priority").limit(1).maybeSingle();
  if (!fallback.data?.id) throw new Error("Active commission rule is unavailable.");
  return fallback.data;
}

async function refreshStatement(admin: AdminClient, businessId: string, periodId: string, barberUserId: string) {
  const [{ data: existing }, { data: lines }, { data: adjustments }] = await Promise.all([
    admin.from("settlement_statements").select("id,status").eq("settlement_period_id", periodId).eq("barber_user_id", barberUserId).maybeSingle(),
    admin.from("commission_calculations").select("eligible_basis_cents,tip_cents,refund_cents,barber_amount_cents,status").eq("settlement_period_id", periodId).eq("barber_user_id", barberUserId).neq("status", "voided"),
    admin.from("commission_adjustments").select("amount_cents,status").eq("settlement_period_id", periodId).eq("barber_user_id", barberUserId).in("status", ["approved", "applied"]),
  ]);
  if (existing?.status && ["final", "paid", "voided"].includes(existing.status)) return;
  const gross = (lines ?? []).reduce((sum, row) => sum + number(row.eligible_basis_cents), 0);
  const tips = (lines ?? []).reduce((sum, row) => sum + number(row.tip_cents), 0);
  const refunds = (lines ?? []).reduce((sum, row) => sum + number(row.refund_cents), 0);
  const calculated = (lines ?? []).reduce((sum, row) => sum + number(row.barber_amount_cents), 0);
  const adjustment = (adjustments ?? []).reduce((sum, row) => sum + number(row.amount_cents), 0);
  await admin.from("settlement_statements").upsert({
    business_id: businessId,
    settlement_period_id: periodId,
    barber_user_id: barberUserId,
    gross_basis_cents: gross,
    tips_cents: tips,
    adjustments_cents: adjustment,
    refunds_cents: refunds,
    final_amount_cents: calculated + adjustment,
    status: "provisional",
    statement_snapshot: { generatedBy: "walk_in_payment_reconciliation", lineCount: (lines ?? []).length, generatedAt: new Date().toISOString() },
  }, { onConflict: "settlement_period_id,barber_user_id" });
}

async function upsertCommissionForPayment(admin: AdminClient, payment: Json) {
  if (text(payment.status) !== "paid") return;
  const queueEntryId = text(payment.queue_entry_id);
  if (!queueEntryId) return;
  const { data: queue } = await admin.from("queue_entries")
    .select("id,business_id,location_id,client_id,client_record_id,client_name,client_email,client_phone,service_id,service_slug,service_price_snapshot_cents,metadata")
    .eq("id", queueEntryId).maybeSingle();
  if (!queue?.id) return;

  const assignment = await latestAssignment(admin, queueEntryId);
  if (!assignment.barberUserId) return;
  const clientResult = queue.client_record_id
    ? await admin.from("clients").select("id,auth_user_id,square_customer_id,first_name,last_name,email,phone,created_at").eq("id", queue.client_record_id).maybeSingle()
    : { data: null };
  const ensured = clientResult.data?.id
    ? { client: clientResult.data as Json, verifiedExisting: Boolean((payment.metadata as Json | null)?.verifiedExisting) }
    : await ensureClientRecord(admin, String(queue.business_id), queue as Json);
  const attribution = await commissionAttribution(admin, String(queue.business_id), ensured.client, queue as Json, assignment.barberUserId, Boolean((payment.metadata as Json | null)?.verifiedExisting ?? ensured.verifiedExisting));
  const rule = await activeCommissionRule(admin, String(queue.business_id), attribution.type);
  const metadata = payment.metadata && typeof payment.metadata === "object" && !Array.isArray(payment.metadata) ? payment.metadata as Json : {};
  const serviceAmount = number(metadata.serviceAmountCents) || Math.max(0, number(payment.amount_cents) - number(payment.tip_cents));
  const result = calculateCommission({
    serviceRevenueCents: serviceAmount,
    tipsCents: number(payment.tip_cents),
    processingFeesCents: number(payment.processing_fee_cents),
    attribution: attribution.type,
    rule: {
      id: String(rule.id),
      version: number(rule.version),
      barberRate: Number(rule.barber_rate ?? 0),
      shopRate: Number(rule.shop_rate ?? 0),
      tipsToBarber: rule.tips_to_barber === true,
      includeDiscounts: rule.include_discounts === true,
      includeTaxes: rule.include_taxes === true,
      includeProcessingFees: rule.include_processing_fees === true,
    },
  });
  const paidAt = text(payment.paid_at) ?? new Date().toISOString();
  const periodId = await ensureSettlementPeriod(admin, String(queue.business_id), text(queue.location_id), paidAt);
  const { data: existing } = await admin.from("commission_calculations").select("id,status").eq("queue_entry_id", queueEntryId).maybeSingle();
  const payload = {
    business_id: queue.business_id,
    settlement_period_id: periodId,
    barber_user_id: assignment.barberUserId,
    barber_profile_id: assignment.barberProfileId,
    client_user_id: text(ensured.client.auth_user_id),
    client_record_id: ensured.client.id,
    queue_entry_id: queueEntryId,
    square_order_id: text(payment.square_order_id),
    square_payment_id: text(payment.square_payment_id),
    location_id: queue.location_id,
    service_id: queue.service_id,
    attribution_type: attribution.type,
    attribution_source: attribution.source,
    attribution_evidence: attribution.evidence,
    attribution_rule_version_id: attribution.ruleVersionId,
    commission_rule_version_id: rule.id,
    calculation_version: 1,
    gross_service_cents: serviceAmount,
    product_cents: 0,
    membership_cents: 0,
    package_cents: 0,
    addon_cents: 0,
    discount_cents: 0,
    tax_cents: 0,
    tip_cents: number(payment.tip_cents),
    deposit_cents: 0,
    refund_cents: 0,
    chargeback_cents: 0,
    cancellation_fee_cents: 0,
    no_show_fee_cents: 0,
    processing_fee_cents: number(payment.processing_fee_cents),
    eligible_basis_cents: result.eligibleBasisCents,
    excluded_cents: result.excludedCents,
    barber_rate: result.effectiveBarberRate,
    shop_rate: Math.max(0, 1 - result.effectiveBarberRate),
    barber_amount_cents: result.barberAmountCents,
    shop_amount_cents: result.shopAmountCents,
    status: "provisional",
    calculated_at: paidAt,
    metadata: {
      source: "walk_in_payment",
      clientName: text(queue.client_name),
      serviceName: text(queue.service_slug),
      paymentMethod: text(payment.payment_method),
      receiptNumber: text(payment.square_receipt_number),
      receiptUrl: text(payment.square_receipt_url),
      paidAmountCents: number(payment.amount_cents),
      verifiedExistingClient: attribution.type === "BARBER",
    },
  };
  if (existing?.id && !["locked", "paid", "voided"].includes(String(existing.status))) {
    await admin.from("commission_calculations").update(payload).eq("id", existing.id);
  } else if (!existing?.id) {
    await admin.from("commission_calculations").insert(payload);
  }
  await refreshStatement(admin, String(queue.business_id), periodId, assignment.barberUserId);
}

async function completePaidWalkIn(admin: AdminClient, queueEntryId: string, actorUserId: string | null) {
  const { data: queue } = await admin.from("queue_entries").select("id,business_id,status").eq("id", queueEntryId).maybeSingle();
  if (!queue?.id || queue.status !== "in_service") return;
  const completedAt = new Date().toISOString();
  const { error } = await admin.from("queue_entries").update({ status: "completed", completed_at: completedAt, estimated_wait_minutes: 0 }).eq("id", queueEntryId).eq("status", "in_service");
  if (error) return;
  await Promise.all([
    admin.from("queue_assignments").update({ active: false, released_at: completedAt }).eq("queue_entry_id", queueEntryId).eq("active", true),
    admin.from("queue_status_history").insert({ queue_entry_id: queueEntryId, from_status: "in_service", to_status: "completed", changed_by: actorUserId, note: "Automatically completed after payment" }),
    admin.from("audit_logs").insert({ business_id: queue.business_id, actor_user_id: actorUserId, action: "walk_in_auto_completed_after_payment", resource_type: "queue_entry", resource_id: queueEntryId, metadata: {} }),
  ]);
}

export async function prepareSquareWalkInPayment(admin: AdminClient, input: { businessId: string; locationId: string; queueEntryId: string; actorUserId: string; amountCents?: number }) {
  if (!squareConfig.locationId || !squareConfig.accessToken) throw new Error("Square is not configured.");
  const { data: queue, error } = await admin.from("queue_entries")
    .select("id,business_id,location_id,public_token,client_id,client_record_id,client_name,client_email,client_phone,service_id,service_slug,service_price_snapshot_cents,status,metadata")
    .eq("business_id", input.businessId).eq("id", input.queueEntryId).maybeSingle();
  if (error || !queue?.id) throw new Error("Walk-in was not found.");
  const { data: existingPayment } = await admin.from("walk_in_payments").select("*").eq("queue_entry_id", queue.id).maybeSingle();
  if (existingPayment?.status === "paid") return existingPayment;
  if (existingPayment?.status === "pending" && existingPayment.square_payment_url) return existingPayment;

  const servicePrice = number(queue.service_price_snapshot_cents);
  const amountCents = Number.isInteger(input.amountCents) && Number(input.amountCents) > 0 ? Number(input.amountCents) : servicePrice;
  if (amountCents <= 0) throw new Error("Confirm the walk-in amount before preparing Square payment.");
  const { data: service } = queue.service_id
    ? await admin.from("services").select("name,slug").eq("id", queue.service_id).maybeSingle()
    : { data: null };
  const clientState = await ensureClientRecord(admin, input.businessId, queue as Json);
  const squareCustomerId = await ensureSquareCustomer(admin, clientState.client, queue as Json);
  const assignment = await latestAssignment(admin, String(queue.id));
  const serviceName = localized(service?.name, text(service?.slug) ?? text(queue.service_slug) ?? "Barber service");
  const clientName = text(queue.client_name) ?? "Walk-in client";
  const link = await squareRequest<{ payment_link?: { id?: string; order_id?: string; url?: string; long_url?: string } }>("/v2/online-checkout/payment-links", {
    method: "POST",
    idempotencyKey: `walkin-payment-${queue.id}`,
    body: {
      description: `Walk-in payment · ${clientName}`,
      order: {
        location_id: squareConfig.locationId,
        customer_id: squareCustomerId,
        reference_id: `LBL-WI-${String(queue.public_token).slice(0, 24)}`,
        line_items: [{
          quantity: "1",
          name: `${serviceName} — ${clientName}`.slice(0, 255),
          base_price_money: { amount: amountCents, currency: "USD" },
          note: `Walk-in ${String(queue.public_token)}`,
        }],
      },
      checkout_options: { allow_tipping: true },
      pre_populated_data: {
        buyer_email: text(queue.client_email) ?? undefined,
        buyer_phone_number: text(queue.client_phone) ?? undefined,
      },
      payment_note: `Luxury Barber Lounge · Walk-in ${queue.public_token} · ${clientName}`,
    },
  });
  const paymentLink = link.payment_link;
  if (!paymentLink?.id || !paymentLink.order_id || !paymentLink.url) throw new Error("Square checkout could not be prepared.");
  const metadata = {
    serviceAmountCents: amountCents,
    verifiedExisting: clientState.verifiedExisting,
    publicToken: queue.public_token,
    clientName,
    serviceName,
    preparedAt: new Date().toISOString(),
  };
  const { data: payment, error: paymentError } = await admin.from("walk_in_payments").upsert({
    business_id: input.businessId,
    location_id: input.locationId,
    queue_entry_id: queue.id,
    client_record_id: clientState.client.id,
    barber_profile_id: assignment.barberProfileId,
    barber_user_id: assignment.barberUserId,
    payment_method: "square",
    status: "pending",
    amount_cents: amountCents,
    currency: "USD",
    square_customer_id: squareCustomerId,
    square_order_id: paymentLink.order_id,
    square_payment_link_id: paymentLink.id,
    square_payment_url: paymentLink.url,
    recorded_by: input.actorUserId,
    metadata,
  }, { onConflict: "queue_entry_id" }).select("*").single();
  if (paymentError || !payment?.id) throw paymentError ?? new Error("Walk-in payment record could not be prepared.");
  return payment;
}

export async function recordCashWalkInPayment(admin: AdminClient, input: { businessId: string; locationId: string; queueEntryId: string; actorUserId: string; amountCents?: number; tipCents?: number }) {
  const { data: queue, error } = await admin.from("queue_entries")
    .select("id,business_id,location_id,client_id,client_record_id,client_name,client_email,client_phone,service_id,service_slug,service_price_snapshot_cents,status,metadata")
    .eq("business_id", input.businessId).eq("id", input.queueEntryId).maybeSingle();
  if (error || !queue?.id) throw new Error("Walk-in was not found.");
  const servicePrice = number(queue.service_price_snapshot_cents);
  const amountCents = Number.isInteger(input.amountCents) && Number(input.amountCents) > 0 ? Number(input.amountCents) : servicePrice;
  const tipCents = Number.isInteger(input.tipCents) && Number(input.tipCents) >= 0 ? Number(input.tipCents) : 0;
  if (amountCents <= 0) throw new Error("Confirm the cash amount before recording payment.");
  const { data: prior } = await admin.from("walk_in_payments").select("status,payment_method").eq("queue_entry_id", queue.id).maybeSingle();
  if (prior?.status === "paid") throw new Error("This walk-in is already marked paid.");
  const clientState = await ensureClientRecord(admin, input.businessId, queue as Json);
  const assignment = await latestAssignment(admin, String(queue.id));
  const paidAt = new Date().toISOString();
  const { data: payment, error: paymentError } = await admin.from("walk_in_payments").upsert({
    business_id: input.businessId,
    location_id: input.locationId,
    queue_entry_id: queue.id,
    client_record_id: clientState.client.id,
    barber_profile_id: assignment.barberProfileId,
    barber_user_id: assignment.barberUserId,
    payment_method: "cash",
    status: "paid",
    amount_cents: amountCents,
    tip_cents: tipCents,
    currency: "USD",
    paid_at: paidAt,
    recorded_by: input.actorUserId,
    metadata: { serviceAmountCents: amountCents, verifiedExisting: clientState.verifiedExisting, clientName: queue.client_name, paymentRecordedAt: paidAt },
  }, { onConflict: "queue_entry_id" }).select("*").single();
  if (paymentError || !payment?.id) throw paymentError ?? new Error("Cash payment could not be recorded.");
  await upsertCommissionForPayment(admin, payment as Json);
  await completePaidWalkIn(admin, String(queue.id), input.actorUserId);
  return payment;
}

export async function reconcilePendingWalkInSquarePayments(admin: AdminClient, businessId: string) {
  const { data: pending } = await admin.from("walk_in_payments").select("*")
    .eq("business_id", businessId).eq("payment_method", "square").eq("status", "pending").not("square_order_id", "is", null).limit(100);
  const rows = pending ?? [];
  const orderIds = [...new Set(rows.map((row) => text(row.square_order_id)).filter((id): id is string => Boolean(id)))];
  if (!orderIds.length) return { matched: 0 };
  const { data: squarePayments } = await admin.from("square_payments")
    .select("square_id,square_order_id,square_customer_id,status,amount_cents,tip_cents,processing_fee_cents,created_at_square,updated_at_square,raw")
    .eq("business_id", businessId).in("square_order_id", orderIds).in("status", ["COMPLETED", "APPROVED"]).order("created_at_square", { ascending: false });
  let matched = 0;
  for (const pendingPayment of rows) {
    const square = (squarePayments ?? []).find((candidate) => candidate.square_order_id === pendingPayment.square_order_id);
    if (!square?.square_id) continue;
    const raw = square.raw && typeof square.raw === "object" && !Array.isArray(square.raw) ? square.raw as Json : {};
    const paidAt = text(square.updated_at_square) ?? text(square.created_at_square) ?? new Date().toISOString();
    const { data: updated, error } = await admin.from("walk_in_payments").update({
      status: "paid",
      amount_cents: number(square.amount_cents) || number(pendingPayment.amount_cents),
      tip_cents: number(square.tip_cents),
      processing_fee_cents: number(square.processing_fee_cents),
      square_customer_id: text(square.square_customer_id) ?? text(pendingPayment.square_customer_id),
      square_payment_id: square.square_id,
      square_receipt_number: text(raw.receipt_number),
      square_receipt_url: text(raw.receipt_url),
      paid_at: paidAt,
      metadata: { ...(pendingPayment.metadata as Json ?? {}), reconciledAt: new Date().toISOString() },
    }).eq("id", pendingPayment.id).eq("status", "pending").select("*").maybeSingle();
    if (error || !updated?.id) continue;
    await upsertCommissionForPayment(admin, updated as Json);
    await completePaidWalkIn(admin, String(updated.queue_entry_id), text(updated.recorded_by));
    matched += 1;
  }
  return { matched };
}

export async function loadWalkInPayments(admin: AdminClient, businessId: string, queueEntryIds?: string[]) {
  await reconcilePendingWalkInSquarePayments(admin, businessId).catch(() => ({ matched: 0 }));
  let query = admin.from("walk_in_payments").select("id,queue_entry_id,payment_method,status,amount_cents,tip_cents,square_payment_id,square_order_id,square_payment_url,square_receipt_number,square_receipt_url,paid_at,metadata,updated_at").eq("business_id", businessId);
  if (queueEntryIds?.length) query = query.in("queue_entry_id", queueEntryIds);
  const { data, error } = await query.order("updated_at", { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function loadTodayRevenue() {
  const admin = createUntypedAdminSupabase();
  if (!admin) return { totalCents: 0, squareCents: 0, cashCents: 0 };
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return { totalCents: 0, squareCents: 0, cashCents: 0 };
  const today = dateInZone(new Date(), businessConfig.timezone);
  const tomorrow = addDays(today, 1);
  const start = zonedDateTimeToUtc(today, "00:00:00", businessConfig.timezone).toISOString();
  const end = zonedDateTimeToUtc(tomorrow, "00:00:00", businessConfig.timezone).toISOString();
  const [square, cash] = await Promise.all([
    admin.from("square_payments").select("amount_cents,status,created_at_square").eq("business_id", business.id).in("status", ["COMPLETED", "APPROVED"]).gte("created_at_square", start).lt("created_at_square", end),
    admin.from("walk_in_payments").select("amount_cents,status,payment_method,paid_at").eq("business_id", business.id).eq("status", "paid").eq("payment_method", "cash").gte("paid_at", start).lt("paid_at", end),
  ]);
  const squareCents = (square.data ?? []).reduce((sum, row) => sum + number(row.amount_cents), 0);
  const cashCents = (cash.data ?? []).reduce((sum, row) => sum + number(row.amount_cents), 0);
  return { totalCents: squareCents + cashCents, squareCents, cashCents };
}
