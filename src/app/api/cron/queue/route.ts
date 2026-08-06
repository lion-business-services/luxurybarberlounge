import { NextRequest, NextResponse } from "next/server";
import { features } from "@/lib/config/features";
import { assignNextQueueEntry, getQueueContext, recalculateQueueWaits } from "@/lib/queue/operations";

export async function GET(request: NextRequest) {
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  if (!features.walkInQueue) return NextResponse.json({ ok: true, skipped: true, reason: "walk-in queue disabled" });
  const context = await getQueueContext();
  if (!context) return NextResponse.json({ ok: false, message: "Queue context is unavailable." }, { status: 503 });
  try {
    const before = await recalculateQueueWaits(context);
    const assignment = await assignNextQueueEntry(context, null);
    const after = assignment ? await recalculateQueueWaits(context) : before;
    return NextResponse.json({ ok: true, activeEntries: after.entries.length, assigned: Boolean(assignment), decision: assignment?.decision ?? null });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Queue automation failed." }, { status: 500 });
  }
}
