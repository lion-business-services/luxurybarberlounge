import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { listPlacements } from "@/lib/booking/availability";
import { requestCorrelationId } from "@/lib/booking/observability";
import { businessConfig } from "@/lib/config/business";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const operatingRoles = new Set(["receptionist", "manager", "owner", "super_admin"]);

const querySchema = z.object({
  appointmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  barberProfileId: z.string().uuid().optional(),
});

/**
 * Open times for moving one appointment to a given day (and optionally to
 * another barber). The list comes from the same engine as the public booking
 * page; saving the move is still decided by the database.
 */
export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => operatingRoles.has(role))) {
    return NextResponse.json({ ok: false, message: "Shop access is required." }, { status: 403, headers: NO_STORE });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Calendar data is unavailable." }, { status: 503, headers: NO_STORE });

  const parsed = querySchema.safeParse({
    appointmentId: request.nextUrl.searchParams.get("appointmentId"),
    date: request.nextUrl.searchParams.get("date"),
    barberProfileId: request.nextUrl.searchParams.get("barberProfileId") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose a valid date." }, { status: 422, headers: NO_STORE });

  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration is unavailable." }, { status: 503, headers: NO_STORE });

  const { data: appointment } = await admin
    .from("appointments")
    .select("id,location_id,barber_profile_id,starts_at,ends_at,timezone")
    .eq("business_id", business.id)
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();
  if (!appointment?.id) return NextResponse.json({ ok: false, message: "Appointment not found." }, { status: 404, headers: NO_STORE });

  const durationMinutes = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
  try {
    const result = await listPlacements(admin, {
      locationId: appointment.location_id,
      timezone: appointment.timezone || businessConfig.timezone,
      barberId: parsed.data.barberProfileId ?? appointment.barber_profile_id,
      date: parsed.data.date,
      durationMinutes,
      excludeAppointmentId: appointment.id,
    });
    return NextResponse.json({ ok: true, date: parsed.data.date, durationMinutes, bufferMinutes: result.bufferMinutes, starts: result.starts }, { headers: NO_STORE });
  } catch (caught) {
    console.error("admin-move-slots", { correlationId: requestCorrelationId(request.headers), appointmentId: appointment.id, code: caught instanceof Error ? caught.message : "UNKNOWN" });
    return NextResponse.json({ ok: false, message: "Open times could not be loaded. Please try again." }, { status: 503, headers: NO_STORE });
  }
}
