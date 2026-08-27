import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { businessConfig } from "@/lib/config/business";
import { addDays, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { processNotificationJobs } from "@/lib/notifications/process";

const createSchema = z.object({
  barberProfileId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["available", "unavailable"]),
  fullDay: z.boolean().default(true),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  reason: z.string().trim().max(240).optional(),
});

const cancelSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["time_off", "schedule"]),
});

const activeAppointmentStatuses = [
  "slot_held",
  "pending_confirmation",
  "confirmed",
  "checked_in",
  "assigned",
  "in_service",
];

function canManageAll(roles: readonly string[]) {
  return roles.some((role) => ["manager", "owner", "super_admin"].includes(role));
}

async function context(requestedProfileId?: string) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["barber", "manager", "owner", "super_admin"].includes(role))) return null;

  const admin = createUntypedAdminSupabase();
  if (!admin) return null;

  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  if (!business?.id) return null;

  const manager = canManageAll(session.roles);
  let profileQuery = admin
    .from("barber_profiles")
    .select("id,business_id,staff_user_id,display_name,portal_email,active,status")
    .eq("business_id", business.id)
    .eq("active", true);

  if (requestedProfileId && manager) profileQuery = profileQuery.eq("id", requestedProfileId);
  else profileQuery = profileQuery.eq("staff_user_id", session.user.id);

  const { data: profile } = await profileQuery.maybeSingle();
  if (!profile?.id) return null;

  const { data: location } = await admin
    .from("locations")
    .select("id,timezone")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!location?.id) return null;

  return { session, admin, business, profile, location, manager };
}

function formatWhen(startsAt: string, endsAt: string, timezone: string) {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "short",
  });
  return `${format.format(new Date(startsAt))} – ${format.format(new Date(endsAt))}`;
}

async function queueAvailabilityEmails(
  ctx: NonNullable<Awaited<ReturnType<typeof context>>>,
  input: { kind: "available" | "unavailable"; startsAt: string; endsAt: string; reason?: string },
  eventId: string,
) {
  const barberName = typeof ctx.profile.display_name === "string" ? ctx.profile.display_name : "Barber";
  const when = formatWhen(input.startsAt, input.endsAt, String(ctx.location.timezone || businessConfig.timezone));
  const action = input.kind === "unavailable" ? "marked unavailable" : "added availability";
  const subject = `${barberName} ${action}`;
  const body = `${barberName} ${action} for ${when}.${input.reason ? ` Note: ${input.reason}` : ""}`;
  const jobs: Array<Record<string, unknown>> = [
    {
      business_id: ctx.business.id,
      channel: "email",
      template_key: "barber_availability_changed",
      locale: "en",
      recipient: businessConfig.bookingEmail,
      payload: { subject, body, transactional: true, barberProfileId: ctx.profile.id, availabilityEventId: eventId },
      idempotency_key: `availability-admin:${eventId}`,
      scheduled_for: new Date().toISOString(),
      status: "queued",
    },
  ];

  const barberEmail = String(ctx.profile.portal_email || "").trim() || null;
  if (barberEmail) {
    jobs.push({
      business_id: ctx.business.id,
      user_id: ctx.profile.staff_user_id,
      channel: "email",
      template_key: "barber_availability_changed",
      locale: "en",
      recipient: barberEmail,
      payload: { subject: `Availability updated: ${when}`, body, transactional: true, barberProfileId: ctx.profile.id, availabilityEventId: eventId },
      idempotency_key: `availability-barber:${eventId}`,
      scheduled_for: new Date().toISOString(),
      status: "queued",
    });
  }

  await ctx.admin.from("notification_jobs").upsert(jobs, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
  await processNotificationJobs(ctx.admin, { limit: 10 }).catch((error) => {
    console.error("availability-notification-process", error instanceof Error ? error.message : "UNKNOWN");
  });
}

export async function GET(request: NextRequest) {
  const requestedProfileId = request.nextUrl.searchParams.get("barberProfileId") ?? undefined;
  const ctx = await context(requestedProfileId);
  if (!ctx) return NextResponse.json({ ok: false }, { status: 403 });

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: String(ctx.location.timezone || businessConfig.timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const endDate = addDays(today, 180);
  const rangeStart = zonedDateTimeToUtc(today, "00:00:00", String(ctx.location.timezone || businessConfig.timezone));
  const rangeEnd = zonedDateTimeToUtc(endDate, "23:59:59", String(ctx.location.timezone || businessConfig.timezone));

  const [{ data: timeOff }, { data: schedules }] = await Promise.all([
    ctx.admin
      .from("barber_time_off")
      .select("id,starts_at,ends_at,reason,status,availability_kind,created_at")
      .eq("barber_profile_id", ctx.profile.id)
      .eq("location_id", ctx.location.id)
      .gte("ends_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .neq("status", "cancelled")
      .order("starts_at"),
    ctx.admin
      .from("barber_schedules")
      .select("id,weekday,starts_at,ends_at,effective_from,effective_to,active")
      .eq("barber_profile_id", ctx.profile.id)
      .eq("location_id", ctx.location.id)
      .eq("active", true)
      .order("effective_from")
      .order("weekday"),
  ]);

  const dateOverrides = (schedules ?? []).filter((row) => row.effective_to && row.effective_to === row.effective_from);
  const defaults = (schedules ?? []).filter((row) => !row.effective_to || row.effective_to !== row.effective_from);

  return NextResponse.json(
    {
      ok: true,
      barber: { id: ctx.profile.id, name: ctx.profile.display_name },
      timezone: ctx.location.timezone,
      defaults,
      overrides: [
        ...(timeOff ?? []).map((row) => ({ ...row, source: "time_off", kind: "unavailable" })),
        ...dateOverrides.map((row) => ({ ...row, source: "schedule", kind: "available" })),
      ],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose a valid date and availability window." }, { status: 422 });

  const ctx = await context(parsed.data.barberProfileId);
  if (!ctx) return NextResponse.json({ ok: false }, { status: 403 });

  const timezone = String(ctx.location.timezone || businessConfig.timezone);
  const { date, kind, fullDay, reason } = parsed.data;
  const startTime = fullDay ? "00:00:00" : `${parsed.data.startTime ?? ""}:00`;
  const endTime = fullDay ? "00:00:00" : `${parsed.data.endTime ?? ""}:00`;

  if (!fullDay && (!parsed.data.startTime || !parsed.data.endTime || parsed.data.endTime <= parsed.data.startTime)) {
    return NextResponse.json({ ok: false, message: "End time must be after start time." }, { status: 422 });
  }

  const startsAt = zonedDateTimeToUtc(date, startTime, timezone);
  const endsAt = fullDay
    ? zonedDateTimeToUtc(addDays(date, 1), "00:00:00", timezone)
    : zonedDateTimeToUtc(date, endTime, timezone);

  if (kind === "unavailable") {
    const { count } = await ctx.admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barber_profile_id", ctx.profile.id)
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .in("status", activeAppointmentStatuses);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { ok: false, code: "APPOINTMENTS_EXIST", message: "This time contains an active appointment. Reschedule or cancel that appointment before marking the time unavailable." },
        { status: 409 },
      );
    }

    const { data, error } = await ctx.admin
      .from("barber_time_off")
      .insert({
        barber_profile_id: ctx.profile.id,
        location_id: ctx.location.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: reason || "Barber availability override",
        status: "approved",
        approved_by: ctx.session.user.id,
        availability_kind: "unavailable",
      })
      .select("id")
      .single();

    if (error || !data?.id) return NextResponse.json({ ok: false, message: "Availability could not be updated." }, { status: 409 });
    await queueAvailabilityEmails(ctx, { kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason }, String(data.id));
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  const weekday = weekdayForDate(date);
  const localStart = fullDay ? "00:00:00" : startTime;
  const localEnd = fullDay ? "23:59:59" : endTime;
  const { data, error } = await ctx.admin
    .from("barber_schedules")
    .upsert(
      {
        barber_profile_id: ctx.profile.id,
        barber_user_id: ctx.profile.staff_user_id,
        location_id: ctx.location.id,
        weekday,
        starts_at: localStart,
        ends_at: localEnd,
        active: true,
        effective_from: date,
        effective_to: date,
      },
      { onConflict: "barber_profile_id,location_id,weekday,effective_from" },
    )
    .select("id")
    .single();

  if (error || !data?.id) return NextResponse.json({ ok: false, message: "Availability could not be updated." }, { status: 409 });
  await queueAvailabilityEmails(ctx, { kind, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason }, String(data.id));
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });

  const requestedProfileId = request.nextUrl.searchParams.get("barberProfileId") ?? undefined;
  const ctx = await context(requestedProfileId);
  if (!ctx) return NextResponse.json({ ok: false }, { status: 403 });

  if (parsed.data.source === "time_off") {
    const { error } = await ctx.admin
      .from("barber_time_off")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("barber_profile_id", ctx.profile.id);
    if (error) return NextResponse.json({ ok: false }, { status: 409 });
  } else {
    const { error } = await ctx.admin
      .from("barber_schedules")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("barber_profile_id", ctx.profile.id)
      .not("effective_to", "is", null);
    if (error) return NextResponse.json({ ok: false }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
