import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getQueueContext, loadUnifiedQueueDisplay } from "@/lib/queue/operations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type QueueTiming = {
  walkInAt: string | null;
  createdAt: string | null;
  appointmentId: string | null;
};

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "display";
  if (!checkRateLimit(`queue-display:${ip}`, 240, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before refreshing again." }, { status: 429 });
  }

  const context = await getQueueContext();
  if (!context) return NextResponse.json({ ok: false, location: "Northfield", entries: [] }, { status: 503 });

  try {
    // The shop Queue Board is the live walk-in queue, not the appointment
    // calendar. Standalone appointments previously appeared here and were
    // labelled Paid · Square, which made an appointment look like a walk-in
    // that reception had already marked paid. Only true walk-in queue rows
    // belong on this board; appointment payments remain in Payment Tracking
    // and appointments remain in the appointment calendar.
    const entries = (await loadUnifiedQueueDisplay(context)).filter((entry) => entry.kind === "walk_in");
    const sourceIds = [...new Set(entries.map((entry) => entry.sourceId))];
    const queueTiming = new Map<string, QueueTiming>();
    const paymentByQueue = new Map<string, { status: string; method: string | null }>();

    if (sourceIds.length) {
      const [{ data: queueRows, error: queueError }, { data: paymentRows, error: paymentError }] = await Promise.all([
        context.admin.from("queue_entries").select("id,walk_in_at,created_at,appointment_id").in("id", sourceIds),
        context.admin.from("walk_in_payments").select("queue_entry_id,status,payment_method,updated_at").eq("business_id", context.businessId).in("queue_entry_id", sourceIds).order("updated_at", { ascending: false }),
      ]);
      if (queueError) throw queueError;
      if (paymentError) throw paymentError;
      for (const row of queueRows ?? []) {
        queueTiming.set(String(row.id), {
          walkInAt: typeof row.walk_in_at === "string" ? row.walk_in_at : null,
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          appointmentId: row.appointment_id ? String(row.appointment_id) : null,
        });
      }
      for (const row of paymentRows ?? []) {
        const id = String(row.queue_entry_id);
        if (!paymentByQueue.has(id)) paymentByQueue.set(id, { status: String(row.status ?? "pending"), method: row.payment_method ? String(row.payment_method) : null });
      }
    }

    const linkedAppointmentIds = [...new Set([...queueTiming.values()].map((item) => item.appointmentId).filter((id): id is string => Boolean(id)))];
    const appointmentStarts = new Map<string, string>();
    if (linkedAppointmentIds.length) {
      const { data, error } = await context.admin.from("appointments").select("id,starts_at").in("id", linkedAppointmentIds);
      if (error) throw error;
      for (const row of data ?? []) if (typeof row.starts_at === "string") appointmentStarts.set(String(row.id), row.starts_at);
    }

    const now = Date.now();
    const enrichedEntries = entries.flatMap((entry) => {
      const timing = queueTiming.get(entry.sourceId);
      const linkedAppointmentStart = timing?.appointmentId ? appointmentStarts.get(timing.appointmentId) ?? null : null;
      const scheduledAt = entry.scheduledAt ?? linkedAppointmentStart ?? timing?.walkInAt ?? null;
      const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : Number.NaN;
      const isLiveQueueEntry = Boolean(timing);

      if (!isLiveQueueEntry && Number.isFinite(scheduledMs) && scheduledMs <= now) return [];

      const createdMs = timing?.createdAt ? new Date(timing.createdAt).getTime() : Number.NaN;
      const scheduledWalkIn = Boolean(timing?.walkInAt && Number.isFinite(scheduledMs) && Number.isFinite(createdMs) && scheduledMs > createdMs + 60_000);
      const scheduledTimeIsFuture = Number.isFinite(scheduledMs) && scheduledMs > now;
      const countdownMinutes = Number.isFinite(scheduledMs) ? Math.max(0, Math.ceil((scheduledMs - now) / 60_000)) : null;
      const remainingMinutes = scheduledWalkIn && scheduledTimeIsFuture
        ? countdownMinutes
        : entry.estimatedWaitMinutes;
      const expectedServiceAt = remainingMinutes == null ? null : new Date(now + remainingMinutes * 60_000).toISOString();
      const payment = paymentByQueue.get(entry.sourceId);
      const isPaid = payment?.status === "paid";

      return [{
        ...entry,
        scheduledAt,
        estimatedWaitMinutes: remainingMinutes,
        expectedServiceAt,
        // Public status is intentionally binary. Pending, voided, unmatched,
        // or missing payment records all display as UNPAID. Only the durable
        // admin-confirmed paid state displays as PAID.
        paymentStatus: isPaid ? "paid" : "unpaid",
        paymentMethod: isPaid ? payment?.method ?? null : null,
      }];
    });

    const statusRank = (status: string) => ["in_service", "ready", "called", "assigned", "checked_in", "waiting", "confirmed"].indexOf(status);
    enrichedEntries.sort((a, b) => {
      const aRank = statusRank(a.status);
      const bRank = statusRank(b.status);
      const normalizedA = aRank < 0 ? 99 : aRank;
      const normalizedB = bRank < 0 ? 99 : bRank;
      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
      if (a.scheduledAt) return 1;
      if (b.scheduledAt) return -1;
      return a.position - b.position;
    });

    const positionedEntries = enrichedEntries.map((entry, index) => ({ ...entry, position: index + 1 }));
    const response = NextResponse.json({ ok: true, location: context.locationName, generatedAt: new Date().toISOString(), entries: positionedEntries });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("queue-display-load-failed", error);
    return NextResponse.json({ ok: false, location: context.locationName, entries: [] }, { status: 503 });
  }
}
