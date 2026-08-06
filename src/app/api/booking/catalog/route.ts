import { NextResponse } from "next/server";
import { BookingCatalogError, ensureBookingCatalog } from "@/lib/booking/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { catalog } = await ensureBookingCatalog();
    return NextResponse.json(
      { ok: true, catalog },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const code = error instanceof BookingCatalogError ? error.code : "BOOKING_CATALOG_UNAVAILABLE";
    console.error("booking-catalog", { code });
    const setupRequired = ["BOOKING_MIGRATIONS_REQUIRED", "NO_LIVE_BARBERS", "NO_BOOKABLE_SERVICES", "NO_BOOKABLE_BARBERS", "NO_ACTIVE_BARBER_SCHEDULES"].includes(code);
    return NextResponse.json(
      {
        ok: false,
        code,
        setupRequired,
        message: setupRequired
          ? "Online booking is completing its live schedule setup. Please refresh in a moment or call the lounge."
          : "Online booking is temporarily unavailable. Please call the lounge.",
      },
      { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
