import { NextResponse } from "next/server";
import { ensureBookingCatalog } from "@/lib/booking/catalog";

export async function GET() {
  try {
    const { catalog } = await ensureBookingCatalog();
    return NextResponse.json({ ok: true, catalog }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("booking-catalog", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return NextResponse.json({ ok: false, message: "Online booking is temporarily unavailable. Please call the lounge." }, { status: 503 });
  }
}
