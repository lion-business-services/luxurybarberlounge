import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";
import { dateInZone } from "@/lib/booking/timezone";

const schema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  professionalTitle: z.string().trim().min(2).max(120).optional(),
  shortIntro: z.string().trim().max(500).optional(),
  biography: z.string().trim().max(5000).optional(),
  specialties: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  languages: z.array(z.string().trim().min(2).max(20)).max(10).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  status: z.enum(["draft", "in_review", "approved", "published", "archived"]).optional(),
  squareTeamMemberId: z.string().trim().max(120).nullable().optional(),
  portalEmail: z.string().trim().email().max(254).nullable().optional(),
  acceptingWalkIns: z.boolean().optional(),
  availabilityStatus: z.enum(["available", "busy", "break", "off_duty", "unavailable"]).optional(),
  serviceIds: z.array(z.string().uuid()).max(100).optional(),
  schedules: z.array(z.object({ weekday: z.number().int().min(0).max(6), active: z.boolean(), start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional() })).max(7).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminBusinessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Administrative access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the barber profile changes." }, { status: 400 });
  const { data: current } = await context.admin.from("barber_profiles").select("id,staff_user_id,display_name,professional_title,short_intro,biography,specialties,languages,active,featured,status,square_team_member_id,portal_email,accepting_walk_ins,availability_status").eq("business_id", context.businessId).eq("id", id).maybeSingle();
  if (!current?.id) return NextResponse.json({ ok: false, message: "Barber profile not found." }, { status: 404 });
  const owner = context.session.roles.some((role) => role === "owner" || role === "super_admin");
  if (!owner && (parsed.data.squareTeamMemberId !== undefined || parsed.data.portalEmail !== undefined || parsed.data.active === false || parsed.data.status === "archived")) return NextResponse.json({ ok: false, message: "Owner approval is required for provider mapping, suspension, or archival." }, { status: 403 });
  const update: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) update.display_name = parsed.data.displayName;
  if (parsed.data.professionalTitle !== undefined) update.professional_title = { en: parsed.data.professionalTitle };
  if (parsed.data.shortIntro !== undefined) update.short_intro = { en: parsed.data.shortIntro };
  if (parsed.data.biography !== undefined) update.biography = { en: parsed.data.biography };
  if (parsed.data.specialties !== undefined) update.specialties = parsed.data.specialties;
  if (parsed.data.languages !== undefined) update.languages = parsed.data.languages;
  if (parsed.data.active !== undefined) update.active = parsed.data.active;
  if (parsed.data.featured !== undefined) update.featured = parsed.data.featured;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.squareTeamMemberId !== undefined) update.square_team_member_id = parsed.data.squareTeamMemberId;
  if (parsed.data.portalEmail !== undefined) update.portal_email = parsed.data.portalEmail?.toLowerCase() ?? null;
  if (parsed.data.acceptingWalkIns !== undefined) update.accepting_walk_ins = parsed.data.acceptingWalkIns;
  if (parsed.data.availabilityStatus !== undefined) update.availability_status = parsed.data.availabilityStatus;
  const { error } = await context.admin.from("barber_profiles").update(update).eq("business_id", context.businessId).eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: "The barber profile could not be updated." }, { status: 500 });
  if (current.staff_user_id && parsed.data.active !== undefined) {
    await context.admin.from("staff_profiles").update({ active: parsed.data.active }).eq("business_id", context.businessId).eq("user_id", current.staff_user_id);
  }

  if (parsed.data.serviceIds !== undefined) {
    if (!current.staff_user_id) return NextResponse.json({ ok: false, message: "Invite this barber and complete their sign-in before assigning services." }, { status: 409 });
    const uniqueServiceIds = [...new Set(parsed.data.serviceIds)];
    if (uniqueServiceIds.length) {
      const { data: validServices } = await context.admin.from("services").select("id").eq("business_id", context.businessId).eq("active", true).in("id", uniqueServiceIds);
      if ((validServices ?? []).length !== uniqueServiceIds.length) return NextResponse.json({ ok: false, message: "One or more selected services are unavailable." }, { status: 422 });
    }
    await context.admin.from("staff_services").update({ active: false }).eq("staff_user_id", current.staff_user_id);
    if (uniqueServiceIds.length) {
      const { error: serviceError } = await context.admin.from("staff_services").upsert(
        uniqueServiceIds.map((serviceId) => ({ staff_user_id: current.staff_user_id, service_id: serviceId, active: true })),
        { onConflict: "staff_user_id,service_id" },
      );
      if (serviceError) return NextResponse.json({ ok: false, message: "The barber service eligibility could not be updated." }, { status: 500 });
    }
  }

  if (parsed.data.schedules !== undefined) {
    const weekdays = new Set(parsed.data.schedules.map((schedule) => schedule.weekday));
    if (weekdays.size !== parsed.data.schedules.length) return NextResponse.json({ ok: false, message: "Each weekday may appear only once in the schedule." }, { status: 422 });
    const { data: location } = await context.admin.from("locations").select("id").eq("business_id", context.businessId).eq("slug", "northfield").maybeSingle();
    if (!location?.id) return NextResponse.json({ ok: false, message: "The lounge location is unavailable." }, { status: 409 });
    const today = dateInZone(new Date(), "America/New_York");
    for (const schedule of parsed.data.schedules) {
      const start = schedule.start?.slice(0, 5);
      const end = schedule.end?.slice(0, 5);
      if (schedule.active && (!start || !end || start >= end)) return NextResponse.json({ ok: false, message: "Active schedule days require a valid start time before the end time." }, { status: 422 });
      const { data: existingSchedule } = await context.admin.from("barber_schedules").select("id").eq("barber_profile_id", id).eq("location_id", location.id).eq("weekday", schedule.weekday).eq("active", true).order("effective_from", { ascending: false }).limit(1).maybeSingle();
      if (!schedule.active) {
        await context.admin.from("barber_schedules").update({ active: false, effective_to: today }).eq("barber_profile_id", id).eq("location_id", location.id).eq("weekday", schedule.weekday).eq("active", true);
        continue;
      }
      if (existingSchedule?.id) {
        const { error: scheduleError } = await context.admin.from("barber_schedules").update({ starts_at: start, ends_at: end, effective_to: null, active: true, barber_user_id: current.staff_user_id ?? null }).eq("id", existingSchedule.id);
        if (scheduleError) return NextResponse.json({ ok: false, message: "The barber schedule could not be updated." }, { status: 500 });
      } else {
        const { error: scheduleError } = await context.admin.from("barber_schedules").insert({ barber_profile_id: id, barber_user_id: current.staff_user_id ?? null, location_id: location.id, weekday: schedule.weekday, starts_at: start, ends_at: end, effective_from: today, effective_to: null, active: true });
        if (scheduleError) return NextResponse.json({ ok: false, message: "The barber schedule could not be created." }, { status: 500 });
      }
    }
  }

  await context.admin.from("audit_logs").insert({
    business_id: context.businessId,
    actor_user_id: context.session.user.id,
    action: "barber_profile_updated",
    resource_type: "barber_profile",
    resource_id: id,
    before_data: current,
    after_data: { ...update, serviceIds: parsed.data.serviceIds, schedules: parsed.data.schedules },
    metadata: {},
  });
  return NextResponse.json({ ok: true });
}
