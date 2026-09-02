import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getQueueContext, loadUnifiedQueueDisplay } from "@/lib/queue/operations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const queueTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});

type QueueTiming = {
  walkInAt: string | null;
  createdAt: string | null;
  appointmentId: string | null;
};

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "display";
  if (!checkRateLimit(`queue-display:${ip}`, 180, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before refreshing again." }, { status: 429 });
  }

  const context = await getQueueContext();
  if (!context) {
    return NextResponse.json({ ok: false, location: "Northfield", entries: [] }, { status: 503 });
  }

  try {
    const entries = await loadUnifiedQueueDisplay(context);
    const sourceIds = [...new Set(entries.map((entry) => entry.sourceId))];
    const queueTiming = new Map<string, QueueTiming>();

    if (sourceIds.length) {
      const { data, error } = await context.admin
        .from("queue_entries")
        .select("id,walk_in_at,created_at,appointment_id")
        .in("id", sourceIds);

      if (error) throw error;

      for (const row of data ?? []) {
        queueTiming.set(String(row.id), {
          walkInAt: typeof row.walk_in_at === "string" ? row.walk_in_at : null,
          createdAt: typeof row.created_at === "string" ? row.created_at : null,
          appointmentId: row.appointment_id ? String(row.appointment_id) : null,
        });
      }
    }

    const linkedAppointmentIds = [
      ...new Set(
        [...queueTiming.values()]
          .map((item) => item.appointmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const appointmentStarts = new Map<string, string>();

    if (linkedAppointmentIds.length) {
      const { data, error } = await context.admin
        .from("appointments")
        .select("id,starts_at")
        .in("id", linkedAppointmentIds);

      if (error) throw error;

      for (const row of data ?? []) {
        if (typeof row.starts_at === "string") {
          appointmentStarts.set(String(row.id), row.starts_at);
        }
      }
    }

    const now = Date.now();

    const enrichedEntries = entries.flatMap((entry) => {
      const timing = queueTiming.get(entry.sourceId);
      const linkedAppointmentStart = timing?.appointmentId
        ? appointmentStarts.get(timing.appointmentId) ?? null
        : null;
      const scheduledAt = entry.scheduledAt ?? linkedAppointmentStart ?? timing?.walkInAt ?? null;
      const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : Number.NaN;

      // The public board is deliberately an UPCOMING board. As soon as the
      // scheduled walk-in/appointment time is reached, that name disappears.
      // Terminal queue statuses are already excluded by loadUnifiedQueueDisplay.
      if (Number.isFinite(scheduledMs) && scheduledMs <= now) return [];

      const createdMs = timing?.createdAt ? new Date(timing.createdAt).getTime() : Number.NaN;
      const scheduledWalkIn = Boolean(
        timing?.walkInAt && Number.isFinite(scheduledMs) && Number.isFinite(createdMs) && scheduledMs > createdMs + 60_000,
      );
      const countdownMinutes = Number.isFinite(scheduledMs)
        ? Math.max(0, Math.ceil((scheduledMs - now) / 60_000))
        : null;
      const remainingMinutes = entry.kind === "appointment" || scheduledWalkIn
        ? countdownMinutes
        : entry.estimatedWaitMinutes;
      const timeLabel = scheduledAt && Number.isFinite(scheduledMs)
        ? queueTimeFormatter.format(new Date(scheduledAt))
        : null;

      return [{
        ...entry,
        scheduledAt,
        estimatedWaitMinutes: remainingMinutes,
        barber: timeLabel ? `${entry.barber} · ${timeLabel}` : entry.barber,
      }];
    });

    const statusRank = (status: string) => ["in_service", "ready", "called", "assigned", "checked_in", "waiting", "confirmed"].indexOf(status);

    enrichedEntries.sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
        const byTime = a.scheduledAt.localeCompare(b.scheduledAt);
        if (byTime !== 0) return byTime;
      }
      if (a.scheduledAt && !b.scheduledAt) return 1;
      if (!a.scheduledAt && b.scheduledAt) return -1;

      const aRank = statusRank(a.status);
      const bRank = statusRank(b.status);
      const normalizedA = aRank < 0 ? 99 : aRank;
      const normalizedB = bRank < 0 ? 99 : bRank;
      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return a.position - b.position;
    });

    const positionedEntries = enrichedEntries.map((entry, index) => ({ ...entry, position: index + 1 }));
    const response = NextResponse.json({
      ok: true,
      location: context.locationName,
      generatedAt: new Date().toISOString(),
      entries: positionedEntries,
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("queue-display-load-failed", error);
    return NextResponse.json({ ok: false, location: context.locationName, entries: [] }, { status: 503 });
  }
}
