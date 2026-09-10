import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";
import { getQueueContext, recalculateQueueWaits } from "@/lib/queue/operations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);

async function authorize() {
  const session = await getServerAuthSession();
  return session.user && session.roles.some((role) => allowed.has(role)) ? session : null;
}

export async function GET() {
  if (!await authorize()) {
    return NextResponse.json({ ok: false, message: "Operational access is required." }, { status: 403 });
  }

  const context = await getQueueContext();
  if (!context) {
    return NextResponse.json({ ok: true, live: false, entries: [], barbers: [] });
  }

  try {
    const live = await recalculateQueueWaits(context);
    const ids = live.entries.map((entry) => entry.id);

    const { data: rawRows, error: rawError } = ids.length
      ? await context.admin
          .from("queue_entries")
          .select("id,appointment_id,client_email,client_phone,walk_in_at,joined_at,service_price_snapshot_cents,created_at")
          .in("id", ids)
      : { data: [], error: null };

    if (rawError) throw rawError;

    // Admin Queue is the walk-in operational workspace. Scheduled appointment
    // queue records are intentionally excluded so their payment state can never
    // masquerade as a walk-in payment.
    const walkInRows = (rawRows ?? []).filter((row) => !row.appointment_id);
    const walkInIds = walkInRows.map((row) => String(row.id));

    const { data: payments, error: paymentError } = walkInIds.length
      ? await context.admin
          .from("walk_in_payments")
          .select("id,queue_entry_id,payment_method,status,amount_cents,tip_cents,square_payment_url,square_receipt_number,square_receipt_url,paid_at,updated_at")
          .eq("business_id", context.businessId)
          .in("queue_entry_id", walkInIds)
          .order("updated_at", { ascending: false })
      : { data: [], error: null };

    if (paymentError) throw paymentError;

    const rawById = new Map(walkInRows.map((row) => [String(row.id), row]));
    const paymentById = new Map<string, Record<string, unknown>>();
    for (const payment of payments ?? []) {
      const queueEntryId = String(payment.queue_entry_id);
      if (!paymentById.has(queueEntryId)) paymentById.set(queueEntryId, payment as Record<string, unknown>);
    }

    const now = Date.now();
    const entries = live.entries
      .filter((entry) => rawById.has(entry.id))
      .map((entry) => {
        const raw = rawById.get(entry.id);
        const payment = paymentById.get(entry.id) ?? null;
        const scheduledAt = typeof raw?.walk_in_at === "string" ? raw.walk_in_at : entry.joinedAt;
        const scheduledMs = new Date(scheduledAt).getTime();
        const scheduledDelay = Number.isFinite(scheduledMs) && scheduledMs > now
          ? Math.ceil((scheduledMs - now) / 60_000)
          : 0;
        const engineWait = typeof entry.estimatedWaitMinutes === "number" ? entry.estimatedWaitMinutes : null;
        const remainingMinutes = engineWait == null ? (scheduledDelay || null) : Math.max(engineWait, scheduledDelay);
        const expectedServiceAt = remainingMinutes == null
          ? null
          : new Date(now + remainingMinutes * 60_000).toISOString();

        return {
          ...entry,
          clientEmail: typeof raw?.client_email === "string" ? raw.client_email : null,
          clientPhone: typeof raw?.client_phone === "string" ? raw.client_phone : entry.clientPhone,
          walkInAt: scheduledAt,
          expectedServiceAt,
          remainingMinutes,
          servicePriceCents: typeof raw?.service_price_snapshot_cents === "number"
            ? raw.service_price_snapshot_cents
            : null,
          payment: payment ? {
            id: String(payment.id),
            status: String(payment.status),
            paymentMethod: String(payment.payment_method),
            amountCents: Number(payment.amount_cents ?? 0),
            tipCents: Number(payment.tip_cents ?? 0),
            squarePaymentUrl: typeof payment.square_payment_url === "string" ? payment.square_payment_url : null,
            squareReceiptNumber: typeof payment.square_receipt_number === "string" ? payment.square_receipt_number : null,
            squareReceiptUrl: typeof payment.square_receipt_url === "string" ? payment.square_receipt_url : null,
            paidAt: typeof payment.paid_at === "string" ? payment.paid_at : null,
          } : null,
        };
      });

    const response = NextResponse.json({ ok: true, live: true, entries, barbers: live.barbers, generatedAt: new Date().toISOString() });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("queue-operations-snapshot-failed", error);
    return NextResponse.json({ ok: false, message: "The live queue could not be loaded." }, { status: 503 });
  }
}
