import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getQueueContext, loadUnifiedQueueDisplay } from "@/lib/queue/operations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "display";
  if (!checkRateLimit(`queue-display:${ip}`, 180, 60_000).allowed) {
    return NextResponse.json({ ok: false, message: "Please wait before refreshing again." }, { status: 429 });
  }
  const context = await getQueueContext();
  if (!context) return NextResponse.json({ ok: false, location: "Northfield", entries: [] }, { status: 503 });
  try {
    const entries = await loadUnifiedQueueDisplay(context);
    const response = NextResponse.json({ ok: true, location: context.locationName, generatedAt: new Date().toISOString(), entries });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json({ ok: false, location: context.locationName, entries: [] }, { status: 503 });
  }
}
