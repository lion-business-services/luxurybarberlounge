import "server-only";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { addDays, dateInZone, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { calculateCommission } from "./engine";

const TIME_ZONE = "America/New_York";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;
type ModernAppointment = {
  id: string;
  client_id?: string | null;
  auth_user_id?: string | null;
  service_id?: string | null;
  barber_profile_id?: string | null;
  assigned_staff_user_id?: string | null;
  location_id?: string | null;
  square_booking_id?: string | null;
  square_customer_id?: string | null;
  square_order_id?: string | null;
  booking_source?: string | null;
  client_email_snapshot?: string | null;
  client_phone_snapshot?: string | null;
  status?: string | null;
  starts_at?: string | null;
};
type SquareOrder = {
  id: string;
  square_id: string;
  customer_square_id?: string | null;
  total_cents?: number | null;
  tax_cents?: number | null;
  discount_cents?: number | null;
};
type SquarePayment = {
  square_id: string;
  square_order_id?: string | null;
  square_customer_id?: string | null;
  amount_cents?: number | null;
  tip_cents?: number | null;
  processing_fee_cents?: number | null;
  created_at_square?: string | null;
  raw?: { note?: string | null; team_member_id?: string | null } | null;
};
type AttributionRow = {
  attribution?: string | null;
  source?: string | null;
  evidence_summary?: Record<string, unknown> | null;
};

function settlementWindowFor(reference: Date) {
  const localDate = dateInZone(reference, TIME_ZONE);
  const weekday = weekdayForDate(localDate);
  const daysBack = weekday === 0 ? 6 : weekday - 1;
  const monday = addDays(localDate, -daysBack);
  const nextMonday = addDays(monday, 7);
  const start = zonedDateTimeToUtc(monday, "00:00:00", TIME_ZONE);
  const end = zonedDateTimeToUtc(nextMonday, "00:00:00", TIME_ZONE);
  return { key: monday, start, end, label: `${monday} to ${addDays(nextMonday, -1)}` };
}

async function ensureSettlementPeriod(
  admin: AdminClient,
  businessId: string,
  locationId: string | null,
  window: ReturnType<typeof settlementWindowFor>,
) {
  const { data, error } = await admin
    .from("settlement_periods")
    .upsert(
      {
        business_id: businessId,
        location_id: locationId,
        label: window.label,
        starts_at: window.start.toISOString(),
        ends_at: window.end.toISOString(),
        review_deadline: new Date(window.end.getTime() + 24 * 60 * 60_000).toISOString(),
        status: "open",
      },
      { onConflict: "business_id,location_id,starts_at,ends_at" },
    )
    .select("id")
    .single();
  if (error || !data?.id) throw error ?? new Error("Settlement period could not be prepared.");
  return String(data.id);
}

async function prepareStatementsForPeriod(admin: AdminClient, businessId: string, periodId: string) {
  const { data: periodLines } = await admin
    .from("commission_calculations")
    .select("id,barber_user_id,eligible_basis_cents,tip_cents,refund_cents,barber_amount_cents,status,attribution_type,barber_rate")
    .eq("settlement_period_id", periodId)
    .neq("status", "voided");
  const barberIds = [...new Set((periodLines ?? []).map((line) => String(line.barber_user_id)).filter(Boolean))];
  let statementsPrepared = 0;

  for (const barberUserId of barberIds) {
    const lines = (periodLines ?? []).filter((line) => String(line.barber_user_id) === barberUserId);
    const [{ data: adjustments }, { data: existingStatement }] = await Promise.all([
      admin.from("commission_adjustments").select("id,amount_cents,status,reason_code").eq("settlement_period_id", periodId).eq("barber_user_id", barberUserId).in("status", ["approved", "applied"]),
      admin.from("settlement_statements").select("id,status").eq("settlement_period_id", periodId).eq("barber_user_id", barberUserId).maybeSingle(),
    ]);
    if (existingStatement?.status && ["final", "paid", "voided"].includes(existingStatement.status)) continue;

    const grossBasisCents = lines.reduce((sum: number, line) => sum + Number(line.eligible_basis_cents ?? 0), 0);
    const tipsCents = lines.reduce((sum: number, line) => sum + Number(line.tip_cents ?? 0), 0);
    const refundsCents = lines.reduce((sum: number, line) => sum + Number(line.refund_cents ?? 0), 0);
    const adjustmentsCents = (adjustments ?? []).reduce((sum: number, line) => sum + Number(line.amount_cents ?? 0), 0);
    const calculatedCents = lines.reduce((sum: number, line) => sum + Number(line.barber_amount_cents ?? 0), 0);
    const { error: statementError } = await admin.from("settlement_statements").upsert(
      {
        business_id: businessId,
        settlement_period_id: periodId,
        barber_user_id: barberUserId,
        gross_basis_cents: grossBasisCents,
        tips_cents: tipsCents,
        adjustments_cents: adjustmentsCents,
        refunds_cents: refundsCents,
        final_amount_cents: calculatedCents + adjustmentsCents,
        status: "provisional",
        statement_snapshot: {
          policyVersion: "1.0",
          generatedBy: "automatic_reconciliation",
          lineCount: lines.length,
          adjustmentCount: (adjustments ?? []).length,
          payoutMethod: "manual_zelle_or_cash",
          generatedAt: new Date().toISOString(),
        },
      },
      { onConflict: "settlement_period_id,barber_user_id" },
    );
    if (!statementError) statementsPrepared += 1;
  }

  return statementsPrepared;
}

async function exception(admin: AdminClient, runId: string, businessId: string, paymentId: string, code: string, message: string, details: Record<string, unknown> = {}) {
  // Dedupe across ALL runs, not just the current one. The reconciler runs every
  // 15 minutes; scoping to reconciliation_run_id meant each pass re-inserted the
  // same unresolved exception, growing the table ~300 rows/day.
  const { data: existing } = await admin.from("reconciliation_exceptions").select("id").eq("business_id", businessId).eq("resource_type", "square_payment").eq("resource_id", paymentId).eq("exception_code", code).eq("status", "open").maybeSingle();
  if (existing?.id) {
    await admin.from("reconciliation_exceptions").update({ reconciliation_run_id: runId, message, details }).eq("id", existing.id);
    return;
  }
  await admin.from("reconciliation_exceptions").insert({ business_id: businessId, reconciliation_run_id: runId, resource_type: "square_payment", resource_id: paymentId, exception_code: code, severity: "warning", message, details, status: "open" });
}

async function modernAttribution(admin: AdminClient, businessId: string, appointment: ModernAppointment, barberUserId: string) {
  if (String(appointment.booking_source ?? "").toLowerCase().includes("walk")) return { type: "SHOP" as const, source: "walk_in", evidence: { bookingSource: appointment.booking_source } };
  let row: AttributionRow | null = null;
  if (appointment.auth_user_id) {
    const result = await admin.from("client_barber_attributions").select("attribution,source,evidence_summary,effective_from").eq("business_id", businessId).eq("client_user_id", appointment.auth_user_id).eq("barber_user_id", barberUserId).lte("effective_from", new Date().toISOString()).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    row = result.data;
  }
  if (!row && appointment.client_email_snapshot) {
    const result = await admin.from("client_barber_attributions").select("attribution,source,evidence_summary,effective_from").eq("business_id", businessId).eq("client_external_ref", String(appointment.client_email_snapshot).trim().toLowerCase()).eq("barber_user_id", barberUserId).lte("effective_from", new Date().toISOString()).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    row = result.data;
  }
  if (!row && appointment.client_phone_snapshot) {
    const result = await admin.from("client_barber_attributions").select("attribution,source,evidence_summary,effective_from").eq("business_id", businessId).eq("client_external_ref", String(appointment.client_phone_snapshot).trim()).eq("barber_user_id", barberUserId).lte("effective_from", new Date().toISOString()).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    row = result.data;
  }
  return row?.attribution === "BARBER"
    ? { type: "BARBER" as const, source: String(row.source ?? "verified_pre_existing"), evidence: row.evidence_summary ?? {} }
    : { type: "SHOP" as const, source: "default_shop", evidence: { defaulted: true } };
}

async function resolveModernAppointment(admin: AdminClient, businessId: string, order: SquareOrder, payment: SquarePayment) {
  const { data: linkedCheckout } = await admin.from("appointment_payment_links").select("appointment_id,purpose,status").eq("business_id", businessId).eq("square_order_id", order.square_id).maybeSingle();
  if (linkedCheckout?.purpose === "deposit") return { deposit: true, appointment: null };

  // Website deposits stamp the Square payment note with
  //   LBL_DEPOSIT:<appointmentId>:<publicReference>
  // Use it as an authoritative fallback when the order link is missing.
  const noteRef = String((payment as { raw?: { note?: unknown } }).raw?.note ?? "");
  if (noteRef.startsWith("LBL_DEPOSIT:")) return { deposit: true, appointment: null };

  const select = "id,client_id,auth_user_id,service_id,barber_profile_id,assigned_staff_user_id,location_id,square_booking_id,square_customer_id,square_order_id,booking_source,client_email_snapshot,client_phone_snapshot,status,starts_at";
  if (linkedCheckout?.appointment_id) {
    const { data } = await admin.from("appointments").select(select).eq("business_id", businessId).eq("id", linkedCheckout.appointment_id).maybeSingle();
    if (data) return { deposit: false, appointment: data };
  }
  const { data: direct } = await admin.from("appointments").select(select).eq("business_id", businessId).eq("square_order_id", order.square_id).maybeSingle();
  if (direct) return { deposit: false, appointment: direct };

  // square_orders.customer_square_id is null on every POS order; the customer id
  // only survives on the payment. Prefer the payment, fall back to the order.
  const customerSquareId = payment.square_customer_id ?? order.customer_square_id ?? null;
  if (customerSquareId) {
    const paidAt = new Date(payment.created_at_square ?? Date.now());
    const start = new Date(paidAt.getTime() - 24 * 60 * 60_000).toISOString();
    const end = new Date(paidAt.getTime() + 24 * 60 * 60_000).toISOString();
    const { data: candidates } = await admin.from("appointments").select(select).eq("business_id", businessId).eq("square_customer_id", customerSquareId).gte("starts_at", start).lte("starts_at", end).not("status", "in", "(cancelled_by_client,cancelled_by_business,declined,expired,failed)").order("starts_at");
    if ((candidates ?? []).length === 1) {
      const match = candidates![0];
      if (!match.square_order_id) await admin.from("appointments").update({ square_order_id: order.square_id }).eq("id", match.id).is("square_order_id", null);
      return { deposit: false, appointment: match };
    }
  }
  return { deposit: false, appointment: null };
}

export async function reconcileCommissions(limit = 100) {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) throw new Error("Business context is unavailable.");
  const businessId = String(business.id);
  const { data: location } = await admin.from("locations").select("id").eq("business_id", businessId).eq("slug", "northfield").maybeSingle();

  const currentWindow = settlementWindowFor(new Date());
  const currentPeriodId = await ensureSettlementPeriod(admin, businessId, location?.id ?? null, currentWindow);
  const periodCache = new Map<string, string>([[currentWindow.key, currentPeriodId]]);
  const touchedPeriodIds = new Set<string>([currentPeriodId]);

  const { data: run, error: runError } = await admin.from("reconciliation_runs").insert({ business_id: businessId, settlement_period_id: currentPeriodId, run_type: "provisional", status: "running", started_at: new Date().toISOString(), summary: {} }).select("id").single();
  if (runError || !run?.id) throw runError ?? new Error("Reconciliation run could not be started.");

  const [{ data: commissionRule }, { data: attributionRule }] = await Promise.all([
    admin.from("commission_rule_versions").select("id,version,barber_rate,shop_rate,tips_to_barber,include_discounts,include_taxes,include_processing_fees,commission_rules!inner(active,business_id)").eq("commission_rules.business_id", businessId).eq("commission_rules.active", true).lte("effective_from", new Date().toISOString()).order("priority").limit(1).maybeSingle(),
    admin.from("attribution_rule_versions").select("id,version,attribution_rules!inner(active,business_id)").eq("attribution_rules.business_id", businessId).eq("attribution_rules.active", true).lte("effective_from", new Date().toISOString()).order("priority").limit(1).maybeSingle(),
  ]);
  if (!commissionRule?.id || !attributionRule?.id) {
    await admin.from("reconciliation_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_summary: "Active policy versions are missing." }).eq("id", run.id);
    throw new Error("Active commission and attribution policy versions are required.");
  }

  const { data: payments, error } = await admin.from("square_payments").select("id,square_id,square_order_id,square_customer_id,status,amount_cents,tip_cents,processing_fee_cents,created_at_square,raw").eq("business_id", businessId).in("status", ["COMPLETED", "APPROVED"]).gte("created_at_square", new Date(Date.now() - 21 * 24 * 60 * 60_000).toISOString()).order("created_at_square").limit(limit);
  if (error) throw error;
  let calculated = 0, exceptions = 0, skipped = 0, depositsSkipped = 0, modernMatches = 0, legacyMatches = 0;

  for (const payment of payments ?? []) {
    const { data: existing } = await admin.from("commission_calculations").select("id").eq("business_id", businessId).eq("square_payment_id", payment.square_id).limit(1).maybeSingle();
    if (existing?.id) { skipped += 1; continue; }
    if (!payment.square_order_id) { await exception(admin, run.id, businessId, payment.square_id, "ORDER_MISSING", "Payment has no Square order mapping."); exceptions += 1; continue; }

    const { data: order } = await admin.from("square_orders").select("id,square_id,customer_square_id,total_cents,tax_cents,discount_cents").eq("business_id", businessId).eq("square_id", payment.square_order_id).maybeSingle();
    if (!order?.id) { await exception(admin, run.id, businessId, payment.square_id, "ORDER_NOT_SYNCED", "The related Square order has not been synchronized."); exceptions += 1; continue; }

    const modern = await resolveModernAppointment(admin, businessId, order, payment);
    if (modern.deposit) { depositsSkipped += 1; skipped += 1; continue; }

    let source: {
      barberUserId: string;
      clientUserId: string | null;
      appointmentId: string | null;
      clientRecordId: string | null;
      bookingMetadataId: string | null;
      squareBookingId: string | null;
      locationId: string | null;
      serviceId: string | null;
      attributionType: "SHOP" | "BARBER";
      attributionSource: string;
      attributionEvidence: Record<string, unknown>;
      calculationSource: string;
    } | null = null;

    if (modern.appointment) {
      const appointment = modern.appointment;
      let barberUserId = appointment.assigned_staff_user_id ? String(appointment.assigned_staff_user_id) : null;
      if (!barberUserId && appointment.barber_profile_id) {
        const { data: barberProfile } = await admin.from("barber_profiles").select("staff_user_id").eq("id", appointment.barber_profile_id).eq("business_id", businessId).maybeSingle();
        barberUserId = barberProfile?.staff_user_id ? String(barberProfile.staff_user_id) : null;
      }
      if (!barberUserId) { await exception(admin, run.id, businessId, payment.square_id, "BARBER_MISSING", "The matched appointment has no verified barber portal assignment.", { appointmentId: appointment.id }); exceptions += 1; continue; }
      const attribution = await modernAttribution(admin, businessId, appointment, barberUserId);
      source = {
        barberUserId,
        clientUserId: appointment.auth_user_id ? String(appointment.auth_user_id) : null,
        appointmentId: String(appointment.id),
        clientRecordId: appointment.client_id ? String(appointment.client_id) : null,
        bookingMetadataId: null,
        squareBookingId: appointment.square_booking_id ? String(appointment.square_booking_id) : null,
        locationId: appointment.location_id ? String(appointment.location_id) : location?.id ?? null,
        serviceId: appointment.service_id ? String(appointment.service_id) : null,
        attributionType: attribution.type,
        attributionSource: attribution.source,
        attributionEvidence: attribution.evidence,
        calculationSource: "modern_appointment_square_payment",
      };
      modernMatches += 1;
    } else {
      const { data: extension } = await admin.from("order_extensions").select("booking_metadata_id,reconciliation_status").eq("square_order_id", order.id).maybeSingle();
      if (extension?.booking_metadata_id && extension.reconciliation_status === "matched") {
        const { data: booking } = await admin.from("booking_metadata").select("id,client_user_id,barber_user_id,location_id,square_booking_id").eq("id", extension.booking_metadata_id).maybeSingle();
        if (booking?.barber_user_id) {
          const { data: attribution } = await admin.from("booking_attributions").select("attribution_type,source,evidence").eq("booking_metadata_id", booking.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          source = {
            barberUserId: String(booking.barber_user_id),
            clientUserId: booking.client_user_id ? String(booking.client_user_id) : null,
            appointmentId: null,
            clientRecordId: null,
            bookingMetadataId: String(booking.id),
            squareBookingId: booking.square_booking_id ? String(booking.square_booking_id) : null,
            locationId: booking.location_id ? String(booking.location_id) : location?.id ?? null,
            serviceId: null,
            attributionType: attribution?.attribution_type === "BARBER" ? "BARBER" : "SHOP",
            attributionSource: String(attribution?.source ?? "default_shop"),
            attributionEvidence: attribution?.evidence ?? { defaulted: true },
            calculationSource: "legacy_matched_square_payment",
          };
          legacyMatches += 1;
        }
      }
    }

    if (!source) {
      // Distinguish "we could not match this sale" from "Square never recorded
      // who performed it". The second is an operational fix in Square POS
      // (barbers must ring sales under their own team member login) and no
      // amount of matching logic can recover it.
      const teamMemberId = payment.raw?.team_member_id ?? null;
      if (!teamMemberId) {
        await exception(
          admin,
          run.id,
          businessId,
          payment.square_id,
          "TEAM_MEMBER_MISSING",
          "Square recorded no team member for this sale, so no barber can be credited. Enable team member sales attribution in Square POS and have each barber check out under their own login.",
          {
            squareOrderId: order.square_id,
            customerSquareId: payment.square_customer_id ?? null,
            amountCents: payment.amount_cents ?? null,
            remediation: "square_pos_team_member_attribution",
          },
        );
        exceptions += 1;
        continue;
      }
      await exception(admin, run.id, businessId, payment.square_id, "ORDER_NOT_MATCHED", "No unique modern appointment or verified legacy booking match was found for this Square order.", { squareOrderId: order.square_id, customerSquareId: payment.square_customer_id ?? null, teamMemberId });
      exceptions += 1;
      continue;
    }

    const paymentWindow = settlementWindowFor(new Date(payment.created_at_square ?? Date.now()));
    let paymentPeriodId = periodCache.get(paymentWindow.key);
    if (!paymentPeriodId) {
      paymentPeriodId = await ensureSettlementPeriod(admin, businessId, location?.id ?? null, paymentWindow);
      periodCache.set(paymentWindow.key, paymentPeriodId);
    }
    touchedPeriodIds.add(paymentPeriodId);

    const orderNetCents = Math.max(0, Number(order.total_cents ?? payment.amount_cents ?? 0) - Number(order.tax_cents ?? 0));
    const refundResult = await admin.from("square_refunds").select("amount_cents").eq("business_id", businessId).eq("square_payment_id", payment.square_id).eq("status", "COMPLETED");
    const refunds = (refundResult.data ?? []).reduce((sum: number, row) => sum + Number(row.amount_cents ?? 0), 0);
    const result = calculateCommission({
      serviceRevenueCents: orderNetCents,
      discountsCents: Number(order.discount_cents ?? 0),
      refundsCents: refunds,
      taxesCents: Number(order.tax_cents ?? 0),
      tipsCents: Number(payment.tip_cents ?? 0),
      processingFeesCents: Number(payment.processing_fee_cents ?? 0),
      attribution: source.attributionType,
      rule: {
        id: String(commissionRule.id),
        version: Number(commissionRule.version ?? 1),
        barberRate: Number(commissionRule.barber_rate ?? 0.7),
        shopRate: Number(commissionRule.shop_rate ?? 0.3),
        tipsToBarber: commissionRule.tips_to_barber !== false,
        includeDiscounts: commissionRule.include_discounts === true,
        includeTaxes: commissionRule.include_taxes === true,
        includeProcessingFees: commissionRule.include_processing_fees === true,
      },
    });
    const { error: calculationError } = await admin.from("commission_calculations").insert({
      business_id: businessId,
      settlement_period_id: paymentPeriodId,
      reconciliation_run_id: run.id,
      barber_user_id: source.barberUserId,
      client_user_id: source.clientUserId,
      booking_metadata_id: source.bookingMetadataId,
      appointment_id: source.appointmentId,
      client_record_id: source.clientRecordId,
      square_booking_id: source.squareBookingId,
      square_order_id: order.square_id,
      square_payment_id: payment.square_id,
      location_id: source.locationId,
      service_id: source.serviceId,
      attribution_type: source.attributionType,
      attribution_source: source.attributionSource,
      attribution_evidence: source.attributionEvidence,
      attribution_rule_version_id: attributionRule.id,
      commission_rule_version_id: commissionRule.id,
      gross_service_cents: orderNetCents,
      discount_cents: Number(order.discount_cents ?? 0),
      tax_cents: Number(order.tax_cents ?? 0),
      tip_cents: Number(payment.tip_cents ?? 0),
      refund_cents: refunds,
      processing_fee_cents: Number(payment.processing_fee_cents ?? 0),
      eligible_basis_cents: result.eligibleBasisCents,
      excluded_cents: result.excludedCents,
      barber_rate: result.effectiveBarberRate,
      shop_rate: source.attributionType === "BARBER" ? 0 : Number(commissionRule.shop_rate ?? 0.3),
      barber_amount_cents: result.barberAmountCents,
      shop_amount_cents: result.shopAmountCents,
      status: "provisional",
      metadata: { policy_version: "1.0", tips_outside_basis: true, calculation_source: source.calculationSource, deposit_orders_excluded: true },
    });
    if (calculationError) { await exception(admin, run.id, businessId, payment.square_id, "CALCULATION_INSERT_FAILED", "The calculation could not be stored.", { code: calculationError.code }); exceptions += 1; }
    else calculated += 1;
  }

  let statementsPrepared = 0;
  for (const periodId of touchedPeriodIds) {
    statementsPrepared += await prepareStatementsForPeriod(admin, businessId, periodId);
  }

  const status = exceptions ? "completed_with_exceptions" : "completed";
  await admin.from("reconciliation_runs").update({ status, completed_at: new Date().toISOString(), summary: { calculated, exceptions, skipped, depositsSkipped, modernMatches, legacyMatches, statementsPrepared, settlementPeriodsPrepared: touchedPeriodIds.size, policyVersion: "1.0" } }).eq("id", run.id);
  return { runId: run.id, settlementPeriodId: currentPeriodId, settlementPeriodsPrepared: touchedPeriodIds.size, calculated, exceptions, skipped, depositsSkipped, modernMatches, legacyMatches, statementsPrepared, status };
}
