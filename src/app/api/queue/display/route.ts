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

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "display";
  if (!checkRateLimit(`queue-display:${ip}`, 180, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before refreshing again." }, { status: 429 });
  }
  const context = await getQueueContext();
  if (!context) return NextResponse.json({ ok: false, location: "Northfield", entries: [] }, { status: 503 });
  try {
    const entries = await loadUnifiedQueueDisplay(context);
    const walkInIds = entries.filter((entry) => entry.kind === "walk_in").map((entry) => entry.sourceId);
    const walkInTiming = new Map<string, { walkInAt: string; joinedAt: string }>();

    if (walkInIds.length) {
      const { data, error } = await context.admin
        .from("queue_entries")
        .select("id,walk_in_at,joined_at")
        .in("id", walkInIds);
      if (error) throw error;
      for (const row of data ?? []) {
        if (typeof row.walk_in_at !== "string" || typeof row.joined_at !== "string") continue;
        walkInTiming.set(String(row.id), { walkInAt: row.walk_in_at, joinedAt: row.joined_at });
      }
    }

    const now = Date.now();
    const enrichedEntries = entries.map((entry) => {
      const timing = entry.kind === "walk_in" ? walkInTiming.get(entry.sourceId) : undefined;
      const scheduledAt = entry.scheduledAt ?? timing?.walkInAt ?? null;
      const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : Number.NaN;
      const joinedMs = timing ? new Date(timing.joinedAt).getTime() : Number.NaN;
      const scheduledWalkIn = Boolean(
        timing && Number.isFinite(scheduledMs) && Number.isFinite(joinedMs) && scheduledMs > joinedMs + 60_000,
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

      return {
        ...entry,
        scheduledAt,
        estimatedWaitMinutes: remainingMinutes,
        barber: timeLabel ? `${entry.barber} · ${timeLabel}` : entry.barber,
      };
    });

    const response = NextResponse.json({ ok: true, location: context.locationName, generatedAt: new Date().toISOString(), entries: enrichedEntries });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json({ ok: false, location: context.locationName, entries: [] }, { status: 503 });
  }
}