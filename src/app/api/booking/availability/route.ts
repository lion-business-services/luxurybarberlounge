import { NextRequest, NextResponse } from "next/server";
import { availabilityRequestSchema } from "@/lib/booking/schema";
import { searchSupabaseAvailability } from "@/lib/booking/availability";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

export async function POST(request: NextRequest) {
  const limited = rateLimit({ key: `availability:${requestFingerprint(request.headers)}`, limit: 30, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ ok: false, message: "Please wait a moment before refreshing availability." }, { status: 429 });
  const parsed = availabilityRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose a valid service and date." }, { status: 422 });
  try {
    const result = await searchSupabaseAvailability(parsed.data);
    return NextResponse.json({ ok: true, source: result.source, slots: result.slots }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("booking-availability", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return NextResponse.json({ ok: false, message: "Availability could not be loaded. Please try again." }, { status: 503 });
  }
}
