import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";
import { getQueueContext, recalculateQueueWaits } from "@/lib/queue/operations";
import { loadWalkInPayments } from "@/lib/queue/payments";

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

    const [{ data: rawRows, error: rawError }, payments] = await Promise.all([
      ids.length
        ? context.admin
            .from("queue_entries")
            .select("id,client_email,client_phone,walk_in_at,joined_at,service_price_snapshot_cents,created_at")
            .in("id", ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length ? loadWalkInPayments(context.admin, context.businessId, ids) : Promise.resolve([]),
    ]);

    if (rawError) throw rawError;

    const rawById = new Map((rawRows ?? []).map((row) => [String(row.id), row]));
    const paymentById = new Map(payments.map((payment) => [String(payment.queue_entry_id), payment]));
    const now = Date.now();

    const entries = live.entries.map((entry) => {
      const raw = rawById.get(entry.id);
      const payment = paymentById.get(entry.id) ?? null;
      const walkInAt = typeof raw?.walk_in_at === "string" ? raw.walk_in_at : entry.joinedAt;
      const walkInMs = new Date(walkInAt).getTime();
      const scheduledDelay = Number.isFinite(walkInMs) && walkInMs > now
        ? Math.ceil((walkInMs - now) / 60_000)
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
        walkInAt,
        expectedServiceAt,
        remainingMinutes,
        servicePriceCents: typeof raw?.service_price_snapshot_cents === "number" ? raw.service_price_snapshot_cents : null,
        payment: payment ? {
          id: payment.id,
          status: payment.status,
          paymentMethod: payment.payment_method,
          amountCents: payment.amount_cents,
          tipCents: payment.tip_cents,
          squarePaymentUrl: payment.square_payment_url,
          squareReceiptNumber: payment.square_receipt_number,
          squareReceiptUrl: payment.square_receipt_url,
          paidAt: payment.paid_at,
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
