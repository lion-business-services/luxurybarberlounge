import { NextRequest, NextResponse } from "next/server";
import { createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";

function icsDate(value: Date) { return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
function escapeIcs(value: string) { return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n"); }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.includes("client")) return new NextResponse("Authentication required.", { status: 401 });
  const { id } = await params;
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return new NextResponse("Calendar service unavailable.", { status: 503 });
  const { data: booking } = await supabase.from("booking_metadata").select("id,square_booking_id,service_snapshot,metadata").eq("id", id).eq("client_user_id", session.user.id).maybeSingle();
  if (!booking?.id) return new NextResponse("Appointment not found.", { status: 404 });
  const { data: square } = booking.square_booking_id ? await supabase.from("square_bookings").select("starts_at,duration_minutes").eq("square_id", booking.square_booking_id).maybeSingle() : { data: null };
  const metadata = booking.metadata && typeof booking.metadata === "object" ? booking.metadata as Record<string, unknown> : {};
  const startRaw = square?.starts_at ?? (typeof metadata.starts_at === "string" ? metadata.starts_at : null);
  if (!startRaw) return new NextResponse("Appointment time is pending.", { status: 409 });
  const start = new Date(startRaw); const end = new Date(start.getTime() + (square?.duration_minutes ?? 30) * 60_000);
  const snapshot = booking.service_snapshot && typeof booking.service_snapshot === "object" ? booking.service_snapshot as Record<string, unknown> : {};
  const service = typeof snapshot.name === "string" ? snapshot.name : "Luxury Barber Lounge appointment";
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Luxury Barber Lounge//Client Portal//EN", "BEGIN:VEVENT", `UID:${booking.id}@theluxurybarberlounge.com`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${escapeIcs(service)}`, "LOCATION:801 Tilton Road\, Suite 106\, Northfield\, NJ 08225", "DESCRIPTION:Luxury Barber Lounge appointment. Call 609-384-5171 for assistance.", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  return new NextResponse(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="luxury-barber-lounge-${booking.id.slice(0, 8)}.ics"`, "cache-control": "private, no-store" } });
}
