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
    const walkInTiming = new Map<string, { walkInAt: string; createdAt: string }>();

    if (walkInIds.length) {
      const { data, error } = await context.admin
        .from("queue_entries")
        .select("id,walk_in_at,created_at")
        .in("id", walkInIds);
      if (error) throw error;
      for (const row of data ?? []) {
        if (typeof row.walk_in_at !== "string" || typeof row.created_at !== "string") continue;
        walkInTiming.set(String(row.id), { walkInAt: row.walk_in_at, createdAt: row.created_at });
      }
    }

    const now = Date.now();
    const enrichedEntries = entries.map((entry) => {
      const timing = entry.kind === "walk_in" ? walkInTiming.get(entry.sourceId) : undefined;
      const scheduledAt = entry.scheduledAt ?? timing?.walkInAt ?? null;
      const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : Number.NaN;
      const createdMs = timing ? new Date(timing.createdAt).getTime() : Number.NaN;
      const scheduledWalkIn = Boolean(
        timing && Number.isFinite(scheduledMs) && Number.isFinite(createdMs) && scheduledMs > createdMs + 60_000,
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
  } catch {
    return NextResponse.json({ ok: false, location: context.locationName, entries: [] }, { status: 503 });
  }
}