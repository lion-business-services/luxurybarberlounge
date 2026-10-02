import { NextRequest, NextResponse } from "next/server";

import { searchSupabaseAvailability } from "@/lib/booking/availability";
import { requestCorrelationId } from "@/lib/booking/observability";
import { availabilityRequestSchema } from "@/lib/booking/schema";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

// Availability is live operational state. It is computed per request from the
// Supabase scheduling records and must never be cached or prerendered.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: NextRequest) {
  const correlationId = requestCorrelationId(request.headers);
  const limited = rateLimit({
    key: `availability:${requestFingerprint(request.headers)}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, message: "Please wait a moment before refreshing availability." },
      { status: 429, headers: NO_STORE },
    );
  }

  const parsed = availabilityRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Choose a valid service and date." },
      { status: 422, headers: NO_STORE },
    );
  }

  try {
    const result = await searchSupabaseAvailability(parsed.data);

    console.info("booking-availability", {
      correlationId,
      source: result.source,
      locationId: parsed.data.locationId,
      serviceId: parsed.data.serviceId,
      barbers: parsed.data.barberIds?.length ?? "any",
      startDate: parsed.data.startDate,
      days: parsed.data.days,
      familyChildren: parsed.data.familyChildren ?? 0,
      durationMinutes: result.durationMinutes,
      bufferMinutes: result.bufferMinutes,
      slots: result.slots.length,
    });

    return NextResponse.json(
      {
        ok: true,
        source: result.source,
        bufferMinutes: result.bufferMinutes,
        durationMinutes: result.durationMinutes,
        slots: result.slots,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    // Fail closed: when the scheduling records cannot be read, no slot is
    // offered. A stale or guessed list is never returned.
    console.error("booking-availability", {
      correlationId,
      code: error instanceof Error ? error.message : "UNKNOWN",
      locationId: parsed.data.locationId,
      serviceId: parsed.data.serviceId,
      startDate: parsed.data.startDate,
    });

    return NextResponse.json(
      { ok: false, message: "Availability could not be loaded. Please try again." },
      { status: 503, headers: NO_STORE },
    );
  }
}
