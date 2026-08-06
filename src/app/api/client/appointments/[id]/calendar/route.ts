import { NextResponse } from "next/server";
import { createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";
import { absoluteUrl, businessConfig } from "@/lib/config/business";

function ics(value: string) { return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
function stamp(value: string) { return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  const supabase = createUserServerSupabase(session.accessToken);
  if (!supabase) return NextResponse.json({ message: "Calendar unavailable." }, { status: 503 });
  const { id } = await params;
  const { data: appointment } = await supabase.from("appointments").select("id,public_reference,service_name_snapshot,barber_name_snapshot,starts_at,ends_at,timezone,status").eq("id", id).maybeSingle();
  if (!appointment?.id) return NextResponse.json({ message: "Appointment not found." }, { status: 404 });
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Luxury Barber Lounge//Appointments//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${appointment.id}@theluxurybarberlounge.com`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(appointment.starts_at)}`, `DTEND:${stamp(appointment.ends_at)}`, `SUMMARY:${ics(`${appointment.service_name_snapshot} at ${businessConfig.name}`)}`, `DESCRIPTION:${ics(`Barber: ${appointment.barber_name_snapshot}\nReference: ${appointment.public_reference}\nManage: ${absoluteUrl("/client/appointments")}`)}`, `LOCATION:${ics([businessConfig.address.line1, businessConfig.address.city, businessConfig.address.region, businessConfig.address.postalCode].join(", "))}`, `STATUS:${appointment.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  return new NextResponse(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename=Luxury-Barber-Lounge-${appointment.public_reference}.ics`, "cache-control": "private, no-store" } });
}
