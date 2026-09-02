import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/server";
import { activeQueueStatuses, getQueueContext } from "@/lib/queue/operations";
import {
  loadWalkInPayments,
  prepareSquareWalkInPayment,
  reconcilePendingWalkInSquarePayments,
  recordCashWalkInPayment,
} from "@/lib/queue/payments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);

async function authorize() {
  const session = await getServerAuthSession();
  return session.user && session.roles.some((role) => allowed.has(role)) ? session : null;
}

function cents(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export async function GET() {
  const session = await authorize();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  }

  const context = await getQueueContext();
  if (!context) {
    return NextResponse.json({ ok: true, live: false, entries: [] });
  }

  const { data: queueEntries, error } = await context.admin
    .from("queue_entries")
    .select("id,status,service_price_snapshot_cents")
    .eq("business_id", context.businessId)
    .eq("location_id", context.locationId)
    .is("appointment_id", null)
    .in("status", [...activeQueueStatuses])
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, message: "Walk-in payment details could not be loaded." }, { status: 503 });
  }

  const ids = (queueEntries ?? []).map((row) => String(row.id));
  const payments = ids.length ? await loadWalkInPayments(context.admin, context.businessId, ids) : [];
  const paymentByQueueEntry = new Map(payments.map((payment) => [String(payment.queue_entry_id), payment]));

  const entries = (queueEntries ?? []).map((entry) => ({
    queueEntryId: String(entry.id),
    queueStatus: String(entry.status),
    servicePriceCents: typeof entry.service_price_snapshot_cents === "number" ? entry.service_price_snapshot_cents : null,
    payment: paymentByQueueEntry.get(String(entry.id)) ?? null,
  }));

  const response = NextResponse.json({ ok: true, live: true, entries });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function POST(request: NextRequest) {
  const session = await authorize();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  }

  const context = await getQueueContext();
  if (!context) {
    return NextResponse.json({ ok: false, message: "Queue payment operations are unavailable." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as {
    action?: string;
    queueEntryId?: string;
    amountCents?: number;
    tipCents?: number;
  } | null;

  if (!body?.action) {
    return NextResponse.json({ ok: false, message: "A payment action is required." }, { status: 400 });
  }

  if (body.action === "refresh_square") {
    const result = await reconcilePendingWalkInSquarePayments(context.admin, context.businessId);
    return NextResponse.json({ ok: true, result });
  }

  if (!body.queueEntryId) {
    return NextResponse.json({ ok: false, message: "Walk-in is required." }, { status: 422 });
  }

  const { data: entry } = await context.admin
    .from("queue_entries")
    .select("id,status,appointment_id")
    .eq("business_id", context.businessId)
    .eq("location_id", context.locationId)
    .eq("id", body.queueEntryId)
    .maybeSingle();

  if (!entry?.id || entry.appointment_id) {
    return NextResponse.json({ ok: false, message: "Walk-in was not found." }, { status: 404 });
  }

  if (entry.status !== "in_service") {
    return NextResponse.json(
      { ok: false, message: "Set the walk-in to In service before recording payment." },
      { status: 409 },
    );
  }

  const amountCents = cents(body.amountCents);
  const tipCents = cents(body.tipCents);

  try {
    if (body.action === "prepare_square") {
      const payment = await prepareSquareWalkInPayment(context.admin, {
        businessId: context.businessId,
        locationId: context.locationId,
        queueEntryId: body.queueEntryId,
        actorUserId: session.user.id,
        amountCents: amountCents ?? undefined,
      });

      return NextResponse.json({
        ok: true,
        payment: {
          id: payment.id,
          status: payment.status,
          paymentMethod: payment.payment_method,
          amountCents: payment.amount_cents,
          squareOrderId: payment.square_order_id,
          squarePaymentUrl: payment.square_payment_url,
        },
      });
    }

    if (body.action === "record_cash") {
      const payment = await recordCashWalkInPayment(context.admin, {
        businessId: context.businessId,
        locationId: context.locationId,
        queueEntryId: body.queueEntryId,
        actorUserId: session.user.id,
        amountCents: amountCents ?? undefined,
        tipCents: tipCents ?? undefined,
      });

      return NextResponse.json({
        ok: true,
        payment: {
          id: payment.id,
          status: payment.status,
          paymentMethod: payment.payment_method,
          amountCents: payment.amount_cents,
          tipCents: payment.tip_cents,
          paidAt: payment.paid_at,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Walk-in payment could not be updated.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }

  return NextResponse.json({ ok: false, message: "Unsupported payment action." }, { status: 400 });
}
