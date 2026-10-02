import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { requestCorrelationId, schedulingErrorMessage, schedulingErrorReason, schedulingErrorStatus } from "@/lib/booking/observability";
import {
  ACTIVE_STATUSES,
  BREAK_BLOCKING_STATUS,
  COMPLETED_STATUS,
  EARLY_FINISH_GUARD_MINUTES,
  HOLD_STATUSES,
  SCHEDULING_SOURCE_OF_TRUTH,
  TIME_OFF_BLOCKING_KIND,
  TIME_OFF_BLOCKING_STATUS,
  holdIsLive,
  resolveBufferMinutes,
} from "@/lib/booking/rules";
import { addDays, dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

const finishSchema = z.object({
  appointmentId: z.string().uuid(),
  action: z.literal("finish"),
});

/** A barber only ever sees and finishes appointments on their own calendar. */
async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["barber", "manager", "owner", "super_admin"].includes(role))) return null;
  const admin = createUntypedAdminSupabase();
  if (!admin) return null;
  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  if (!business?.id) return null;
  const { data: profile } = await admin
    .from("barber_profiles")
    .select("id,display_name,staff_user_id")
    .eq("business_id", business.id)
    .eq("staff_user_id", session.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!profile?.id) return null;
  const { data: location } = await admin
    .from("locations")
    .select("id,name,timezone")
    .eq("business_id", business.id)
    .eq("slug", "northfield")
    .maybeSingle();
  if (!location?.id) return null;
  return { session, admin, businessId: String(business.id), profile, location };
}

export async function GET(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403, headers: NO_STORE });

  const timezone = String(ctx.location.timezone || businessConfig.timezone);
  const requestedStart = request.nextUrl.searchParams.get("start");
  const startDate = requestedStart && /^\d{4}-\d{2}-\d{2}$/.test(requestedStart) ? requestedStart : dateInZone(new Date(), timezone);
  const days = Math.min(7, Math.max(1, Number(request.nextUrl.searchParams.get("days") ?? 1) || 1));
  const endDate = addDays(startDate, days);
  const rangeStart = zonedDateTimeToUtc(startDate, "00:00:00", timezone).toISOString();
  const rangeEnd = zonedDateTimeToUtc(endDate, "00:00:00", timezone).toISOString();
  const profileId = String(ctx.profile.id);

  const [appointments, holds, schedules, timeOff, breaks, businessHours, holidayHours, settings] = await Promise.all([
    ctx.admin
      .from("appointments")
      .select("id,public_reference,barber_profile_id,client_name_snapshot,service_name_snapshot,starts_at,ends_at,status,deposit_status,completed_at,hold_expires_at,booking_kind,party_size")
      .eq("barber_profile_id", profileId)
      .eq("deposit_status", "paid")
      .in("status", [...ACTIVE_STATUSES, COMPLETED_STATUS])
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart)
      .order("starts_at"),
    // A checkout in progress is shown as a hold without any client details.
    ctx.admin
      .from("appointments")
      .select("id,barber_profile_id,starts_at,ends_at,status,deposit_status,hold_expires_at")
      .eq("barber_profile_id", profileId)
      .in("status", [...HOLD_STATUSES])
      .lt("starts_at", rangeEnd)
      .gt("ends_at", rangeStart)
      .order("starts_at"),
    ctx.admin.from("barber_schedules").select("barber_profile_id,weekday,starts_at,ends_at,effective_from,effective_to,active").eq("barber_profile_id", profileId).eq("location_id", ctx.location.id).eq("active", true),
    ctx.admin.from("barber_time_off").select("id,barber_profile_id,starts_at,ends_at,status,availability_kind").eq("barber_profile_id", profileId).eq("status", TIME_OFF_BLOCKING_STATUS).eq("availability_kind", TIME_OFF_BLOCKING_KIND).lt("starts_at", rangeEnd).gt("ends_at", rangeStart).order("starts_at"),
    ctx.admin.from("barber_breaks").select("id,barber_profile_id,starts_at,ends_at,status").eq("barber_profile_id", profileId).eq("status", BREAK_BLOCKING_STATUS).lt("starts_at", rangeEnd).gt("ends_at", rangeStart).order("starts_at"),
    ctx.admin.from("business_hours").select("weekday,opens_at,closes_at,closed").eq("location_id", ctx.location.id),
    ctx.admin.from("holiday_hours").select("service_date,opens_at,closes_at,closed").eq("location_id", ctx.location.id).gte("service_date", startDate).lt("service_date", endDate),
    ctx.admin.from("location_settings").select("default_buffer_minutes").eq("location_id", ctx.location.id).maybeSingle(),
  ]);

  const failed = [appointments, holds, schedules, timeOff, breaks, businessHours, holidayHours, settings].find((result) => result.error);
  if (failed?.error) {
    console.error("barber-calendar-load-failed", { correlationId: requestCorrelationId(request.headers), code: failed.error.code });
    return NextResponse.json({ ok: false, message: "Your calendar could not be loaded." }, { status: 503, headers: NO_STORE });
  }

  const nowMs = Date.now();
  const liveHolds = (holds.data ?? []).filter((row) => holdIsLive({ deposit_status: row.deposit_status, hold_expires_at: row.hold_expires_at }, nowMs));

  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date(nowMs).toISOString(),
      timezone,
      location: String(ctx.location.name ?? "Northfield Lounge"),
      barber: { id: profileId, name: String(ctx.profile.display_name ?? "Barber") },
      startDate,
      days: Array.from({ length: days }, (_, index) => addDays(startDate, index)),
      appointments: appointments.data ?? [],
      holds: liveHolds.map((row) => ({ ...row, client_name_snapshot: null, service_name_snapshot: null })),
      schedules: schedules.data ?? [],
      timeOff: timeOff.data ?? [],
      breaks: breaks.data ?? [],
      businessHours: businessHours.data ?? [],
      holidayHours: holidayHours.data ?? [],
      rules: {
        source: SCHEDULING_SOURCE_OF_TRUTH,
        bufferMinutes: resolveBufferMinutes(settings.data?.default_buffer_minutes),
        earlyFinishGuardMinutes: EARLY_FINISH_GUARD_MINUTES,
      },
    },
    { headers: NO_STORE },
  );
}

export async function PATCH(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403, headers: NO_STORE });
  const correlationId = requestCorrelationId(request.headers);
  const parsed = finishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose an appointment to finish." }, { status: 422, headers: NO_STORE });

  // Ownership is checked on the server: the appointment must sit on this
  // barber's own calendar. Anything else is reported as not found.
  const { data: appointment } = await ctx.admin
    .from("appointments")
    .select("id,status,barber_profile_id")
    .eq("business_id", ctx.businessId)
    .eq("id", parsed.data.appointmentId)
    .eq("barber_profile_id", ctx.profile.id)
    .maybeSingle();
  if (!appointment?.id) return NextResponse.json({ ok: false, code: "not_found", message: schedulingErrorMessage("not_found") }, { status: 404, headers: NO_STORE });

  const { data, error } = await ctx.admin.rpc("complete_appointment_atomic", {
    p_appointment_id: appointment.id,
    p_actor: ctx.session.user.id,
    p_actor_role: "barber",
    p_reason: "Finished from the barber portal",
  });
  if (error || !data) {
    const reason = schedulingErrorReason(error);
    console.warn("booking-finish", { correlationId, appointmentId: appointment.id, actorRole: "barber", reason, code: error?.code ?? null });
    return NextResponse.json({ ok: false, code: reason, message: schedulingErrorMessage(reason) }, { status: schedulingErrorStatus(reason), headers: NO_STORE });
  }

  const completed = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  const duplicate = appointment.status === COMPLETED_STATUS;
  console.info("booking-finish", { correlationId, appointmentId: appointment.id, actorRole: "barber", duplicate, completedAt: completed.completed_at, availableAgainAt: completed.occupied_until });
  return NextResponse.json({ ok: true, status: COMPLETED_STATUS, duplicate, completedAt: completed.completed_at, availableAgainAt: completed.occupied_until }, { headers: NO_STORE });
}
