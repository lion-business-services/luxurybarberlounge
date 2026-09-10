import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { addDays, dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const allowed = new Set(["receptionist", "manager", "owner", "super_admin"]);
const visibleStatuses = ["confirmed", "checked_in", "assigned", "in_service", "completed", "cancelled_by_client", "cancelled_by_business", "no_show", "rescheduled"];

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => allowed.has(role))) {
    return NextResponse.json({ ok: false, message: "Shop access is required." }, { status: 403 });
  }

  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Calendar data is unavailable." }, { status: 503 });
  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration is unavailable." }, { status: 503 });
  const { data: location } = await admin.from("locations").select("id,name").eq("business_id", business.id).eq("slug", "northfield").maybeSingle();
  if (!location?.id) return NextResponse.json({ ok: false, message: "Location configuration is unavailable." }, { status: 503 });

  const requestedStart = request.nextUrl.searchParams.get("start");
  const startDate = requestedStart && /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) ? requestedStart : dateInZone(new Date(), businessConfig.timezone);
  const days = Math.min(14, Math.max(1, Number(request.nextUrl.searchParams.get("days") ?? 7) || 7));
  const endDate = addDays(startDate, days);
  const rangeStart = zonedDateTimeToUtc(startDate, "00:00:00", businessConfig.timezone).toISOString();
  const rangeEnd = zonedDateTimeToUtc(endDate, "00:00:00", businessConfig.timezone).toISOString();

  const [{ data: barbers, error: barberError }, { data: appointments, error: appointmentError }, { data: schedules, error: scheduleError }, { data: timeOff, error: timeOffError }] = await Promise.all([
    admin.from("barber_profiles").select("id,staff_user_id,display_name,availability_status,accepting_walk_ins,active,status,sort_order").eq("business_id", business.id).eq("active", true).neq("status", "archived").order("sort_order"),
    admin.from("appointments").select("id,public_reference,client_id,auth_user_id,client_name_snapshot,client_email_snapshot,client_phone_snapshot,service_name_snapshot,service_price_snapshot_cents,service_duration_snapshot_minutes,barber_profile_id,barber_name_snapshot,starts_at,ends_at,timezone,status,deposit_status,booking_source").eq("business_id", business.id).eq("location_id", location.id).eq("deposit_status", "paid").in("status", visibleStatuses).gte("starts_at", rangeStart).lt("starts_at", rangeEnd).order("starts_at"),
    admin.from("barber_schedules").select("id,barber_profile_id,barber_user_id,weekday,starts_at,ends_at,effective_from,effective_to,active").eq("location_id", location.id).eq("active", true),
    admin.from("barber_time_off").select("id,barber_profile_id,starts_at,ends_at,reason,status,availability_kind").eq("location_id", location.id).eq("status", "approved").lt("starts_at", rangeEnd).gt("ends_at", rangeStart).order("starts_at"),
  ]);

  if (barberError || appointmentError || scheduleError || timeOffError) {
    console.error("admin-calendar-load-failed", { barberError, appointmentError, scheduleError, timeOffError });
    return NextResponse.json({ ok: false, message: "The appointment calendar could not be loaded." }, { status: 503 });
  }

  const response = NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    timezone: businessConfig.timezone,
    location: String(location.name ?? "Northfield Lounge"),
    startDate,
    endDate,
    days: Array.from({ length: days }, (_, index) => addDays(startDate, index)),
    barbers: barbers ?? [],
    appointments: appointments ?? [],
    schedules: schedules ?? [],
    timeOff: timeOff ?? [],
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
