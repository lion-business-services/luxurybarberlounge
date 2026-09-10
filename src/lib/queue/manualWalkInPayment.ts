import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { recordCashWalkInPayment } from "@/lib/queue/payments";
import { squareRequest } from "@/lib/square/client";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;
type Json = Record<string, unknown>;
type PaymentMethod = "cash" | "square";

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function object(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

async function cancelPendingSquareLink(payment: Json | null) {
  const linkId = typeof payment?.square_payment_link_id === "string" ? payment.square_payment_link_id : null;
  if (!linkId || payment?.status === "paid") return;

  try {
    await squareRequest(`/v2/online-checkout/payment-links/${encodeURIComponent(linkId)}`, { method: "DELETE" });
  } catch {
    throw new Error("The existing Square checkout could not be cancelled safely. Please retry before changing payment status.");
  }
}

async function refreshStatement(
  admin: AdminClient,
  businessId: string,
  settlementPeriodId: string,
  barberUserId: string,
) {
  const [{ data: statement }, { data: lines }, { data: adjustments }] = await Promise.all([
    admin.from("settlement_statements")
      .select("id,status")
      .eq("settlement_period_id", settlementPeriodId)
      .eq("barber_user_id", barberUserId)
      .maybeSingle(),
    admin.from("commission_calculations")
      .select("eligible_basis_cents,tip_cents,refund_cents,barber_amount_cents,status")
      .eq("settlement_period_id", settlementPeriodId)
      .eq("barber_user_id", barberUserId)
      .neq("status", "voided"),
    admin.from("commission_adjustments")
      .select("amount_cents,status")
      .eq("settlement_period_id", settlementPeriodId)
      .eq("barber_user_id", barberUserId)
      .in("status", ["approved", "applied"]),
  ]);

  if (!statement?.id || ["final", "paid", "voided"].includes(String(statement.status))) return;

  const gross = (lines ?? []).reduce((sum, row) => sum + number(row.eligible_basis_cents), 0);
  const tips = (lines ?? []).reduce((sum, row) => sum + number(row.tip_cents), 0);
  const refunds = (lines ?? []).reduce((sum, row) => sum + number(row.refund_cents), 0);
  const calculated = (lines ?? []).reduce((sum, row) => sum + number(row.barber_amount_cents), 0);
  const adjustment = (adjustments ?? []).reduce((sum, row) => sum + number(row.amount_cents), 0);

  await admin.from("settlement_statements").update({
    gross_basis_cents: gross,
    tips_cents: tips,
    adjustments_cents: adjustment,
    refunds_cents: refunds,
    final_amount_cents: calculated + adjustment,
    statement_snapshot: {
      source: "admin_walk_in_payment_status",
      generatedAt: new Date().toISOString(),
      lineCount: (lines ?? []).length,
    },
  }).eq("id", statement.id);
}

async function ensureCommissionCanChange(admin: AdminClient, queueEntryId: string) {
  const { data: rows, error } = await admin.from("commission_calculations")
    .select("id,status,settlement_period_id,barber_user_id,metadata")
    .eq("queue_entry_id", queueEntryId);
  if (error) throw error;

  const blocked = (rows ?? []).find((row) => ["locked", "paid"].includes(String(row.status)));
  if (blocked) {
    throw new Error("This payment can no longer be changed because the related barber statement is locked or paid.");
  }

  return rows ?? [];
}

export async function setManualWalkInPaymentStatus(
  admin: AdminClient,
  input: {
    businessId: string;
    locationId: string;
    queueEntryId: string;
    actorUserId: string;
    status: "paid" | "unpaid";
    paymentMethod?: PaymentMethod;
    amountCents?: number;
  },
) {
  const { data: queue, error: queueError } = await admin.from("queue_entries")
    .select("id,business_id,location_id,appointment_id,client_name,service_price_snapshot_cents,status")
    .eq("business_id", input.businessId)
    .eq("location_id", input.locationId)
    .eq("id", input.queueEntryId)
    .maybeSingle();

  if (queueError || !queue?.id || queue.appointment_id) {
    throw new Error("Walk-in was not found.");
  }

  const { data: existing, error: paymentError } = await admin.from("walk_in_payments")
    .select("*")
    .eq("business_id", input.businessId)
    .eq("queue_entry_id", input.queueEntryId)
    .maybeSingle();
  if (paymentError) throw paymentError;

  const commissionRows = await ensureCommissionCanChange(admin, input.queueEntryId);
  const before = existing ? {
    status: existing.status,
    paymentMethod: existing.payment_method,
    amountCents: existing.amount_cents,
    paidAt: existing.paid_at,
  } : { status: "unpaid", paymentMethod: null, amountCents: null, paidAt: null };

  if (input.status === "unpaid") {
    if (!existing?.id) {
      await admin.from("audit_logs").insert({
        business_id: input.businessId,
        actor_user_id: input.actorUserId,
        actor_role: "admin",
        action: "walk_in_payment_status_confirmed_unpaid",
        resource_type: "queue_entry",
        resource_id: input.queueEntryId,
        before_data: before,
        after_data: { status: "unpaid" },
        metadata: { source: "admin_queue" },
      });
      return null;
    }

    await cancelPendingSquareLink(existing as Json);

    const now = new Date().toISOString();
    const { data: updated, error } = await admin.from("walk_in_payments").update({
      status: "pending",
      paid_at: null,
      recorded_by: input.actorUserId,
      square_customer_id: null,
      square_order_id: null,
      square_payment_id: null,
      square_payment_link_id: null,
      square_payment_url: null,
      square_receipt_number: null,
      square_receipt_url: null,
      processing_fee_cents: 0,
      metadata: {
        ...object(existing.metadata),
        manualAdminStatus: "unpaid",
        manualAdminStatusChangedAt: now,
        manualAdminStatusChangedBy: input.actorUserId,
      },
      updated_at: now,
    }).eq("id", existing.id).select("*").single();
    if (error || !updated?.id) throw error ?? new Error("Payment status could not be changed to unpaid.");

    const affectedStatements = new Map<string, string>();
    for (const row of commissionRows) {
      if (row.status !== "voided") {
        await admin.from("commission_calculations").update({
          status: "voided",
          metadata: {
            ...object(row.metadata),
            voidedReason: "Walk-in payment changed to unpaid by admin",
            voidedAt: now,
            voidedBy: input.actorUserId,
          },
        }).eq("id", row.id);
      }
      if (row.settlement_period_id && row.barber_user_id) {
        affectedStatements.set(String(row.settlement_period_id), String(row.barber_user_id));
      }
    }
    for (const [periodId, barberUserId] of affectedStatements) {
      await refreshStatement(admin, input.businessId, periodId, barberUserId);
    }

    await admin.from("audit_logs").insert({
      business_id: input.businessId,
      actor_user_id: input.actorUserId,
      actor_role: "admin",
      action: "walk_in_payment_marked_unpaid",
      resource_type: "walk_in_payment",
      resource_id: updated.id,
      before_data: before,
      after_data: { status: "unpaid" },
      metadata: { source: "admin_queue", queueEntryId: input.queueEntryId },
    });

    return updated;
  }

  const paymentMethod = input.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "square") {
    throw new Error("Choose Cash or Square before marking this walk-in paid.");
  }

  const servicePrice = number(queue.service_price_snapshot_cents);
  const amountCents = Number.isInteger(input.amountCents) && Number(input.amountCents) > 0
    ? Number(input.amountCents)
    : servicePrice;
  if (amountCents <= 0) throw new Error("Enter the final service amount before marking this walk-in paid.");

  if (
    existing?.status === "paid" &&
    existing.payment_method === paymentMethod &&
    number(existing.amount_cents) === amountCents
  ) {
    return existing;
  }

  await cancelPendingSquareLink(existing as Json | null);

  if (existing?.status === "paid") {
    const { error } = await admin.from("walk_in_payments").update({ status: "pending", paid_at: null }).eq("id", existing.id);
    if (error) throw error;
  }

  const basePayment = await recordCashWalkInPayment(admin, {
    businessId: input.businessId,
    locationId: input.locationId,
    queueEntryId: input.queueEntryId,
    actorUserId: input.actorUserId,
    amountCents,
    tipCents: 0,
  });

  const now = new Date().toISOString();
  const { data: updated, error } = await admin.from("walk_in_payments").update({
    payment_method: paymentMethod,
    status: "paid",
    amount_cents: amountCents,
    paid_at: basePayment.paid_at ?? now,
    recorded_by: input.actorUserId,
    square_customer_id: null,
    square_order_id: null,
    square_payment_id: null,
    square_payment_link_id: null,
    square_payment_url: null,
    square_receipt_number: null,
    square_receipt_url: null,
    processing_fee_cents: 0,
    metadata: {
      ...object(basePayment.metadata),
      manualAdminStatus: "paid",
      manualAdminPaymentMethod: paymentMethod,
      manualAdminStatusChangedAt: now,
      manualAdminStatusChangedBy: input.actorUserId,
      note: paymentMethod === "square"
        ? "Admin confirmed the walk-in was paid through Square/POS. No client checkout was launched from the queue."
        : "Admin confirmed cash was received.",
    },
    updated_at: now,
  }).eq("id", basePayment.id).select("*").single();
  if (error || !updated?.id) throw error ?? new Error("Walk-in payment status could not be saved.");

  const { data: refreshedCommissionRows } = await admin.from("commission_calculations")
    .select("id,status,metadata")
    .eq("queue_entry_id", input.queueEntryId);
  for (const row of refreshedCommissionRows ?? []) {
    if (["locked", "paid", "voided"].includes(String(row.status))) continue;
    await admin.from("commission_calculations").update({
      metadata: {
        ...object(row.metadata),
        paymentMethod,
        paymentStatusSource: "admin_queue",
      },
    }).eq("id", row.id);
  }

  await admin.from("audit_logs").insert({
    business_id: input.businessId,
    actor_user_id: input.actorUserId,
    actor_role: "admin",
    action: "walk_in_payment_marked_paid",
    resource_type: "walk_in_payment",
    resource_id: updated.id,
    before_data: before,
    after_data: { status: "paid", paymentMethod, amountCents },
    metadata: { source: "admin_queue", queueEntryId: input.queueEntryId },
  });

  return updated;
}
