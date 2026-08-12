import { NextRequest, NextResponse } from "next/server";

import {
  searchSquareBookingAvailability,
  searchSupabaseAvailability,
} from "@/lib/booking/availability";
import { availabilityRequestSchema } from "@/lib/booking/schema";
import { features } from "@/lib/config/features";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";
import { squareIsConfigured } from "@/lib/square/config";

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: `availability:${requestFingerprint(request.headers)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Please wait a moment before refreshing availability.",
      },
      { status: 429 },
    );
  }

  const parsed = availabilityRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Choose a valid service and date.",
      },
      { status: 422 },
    );
  }

  try {
    /*
     * When live Square booking is enabled, Square is the scheduling
     * source of truth. Never silently fall back to locally generated
     * availability if Square credentials are missing.
     */
    if (features.squareLiveBooking && !squareIsConfigured) {
      console.error("booking-availability", {
        code: "SQUARE_NOT_CONFIGURED",
      });

      return NextResponse.json(
        {
          ok: false,
          message:
            "Online booking is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    }

    const result = features.squareLiveBooking
      ? await searchSquareBookingAvailability(parsed.data)
      : await searchSupabaseAvailability(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        source: result.source,
        slots: result.slots,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("booking-availability", {
      code:
        error instanceof Error
          ? error.message
          : "UNKNOWN",
    });

    return NextResponse.json(
      {
        ok: false,
        message:
          "Availability could not be loaded. Please try again.",
      },
      { status: 503 },
    );
  }
}
