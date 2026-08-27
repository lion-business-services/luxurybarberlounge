import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { businessConfig } from "@/lib/config/business";
import { processNotificationJobs } from "@/lib/notifications/process";

export const dynamic = "force-dynamic";

const adminRoles = new Set(["manager", "owner", "super_admin"]);
const activeAppointmentStatuses = ["slot_held", "pending_confirmation", "confirmed", "checked_in", "assigned", "in_service"];

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "declined", "cancelled"]),
  note: z.string().trim().max(400).optional(),
});

function decisionLabel(decision: "approved" | "declined" | "cancelled") {
  if (decision === "approved") return "approved";
  if (decision === "declined") return "declined";
  return "cancelled";
}

/** All barber availability exceptions, newest first, with barber names resolved. */
export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => adminRoles.has(role))) {
    return NextResponse.json({ ok: false, message: "Manager access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, entries: [] });

  const scope = request.nextUrl.searchParams.get("scope") ?? "upcoming";

  let query = admin
    .from("barber_time_off")
    .select("id,barber_profile_id,starts_at,ends_at,reason,status,availability_kind,created_at")
    .order("starts_at", { ascending: true });

  if (scope === "upcoming") query = query.gte("ends_at", new Date().toISOString());
  if (scope === "pending") query = query.eq("status", "requested");

  const { data: rows } = await query.limit(300);

  const ids = [...new Set((rows ?? []).map((row) => String(row.barber_profile_id)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await admin
      .from("barber_profiles")
      .select("id,display_name")
      .in("id", ids);
    for (const profile of profiles ?? []) names.set(String(profile.id), String(profile.display_name));
  }

  return NextResponse.json({
    ok: true,
    entries: (rows ?? []).map((row) => ({
      ...row,
      barber_name: names.get(String(row.barber_profile_id)) ?? "Unknown barber",
    })),
  });
}

/** Approve, decline, or cancel a time-off request without stranding booked clients. */
export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => adminRoles.has(role))) {
    return NextResponse.json({ ok: false, message: "Manager access is required." }, { status: 403 });
  }
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 422 });

  const { data: entry } = await admin
    .from("barber_time_off")
    .select("id,barber_profile_id,location_id,starts_at,ends_at,status,availability_kind,reason")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!entry) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  let conflicts = 0;
  if (parsed.data.decision === "approved" && String(entry.availability_kind || "unavailable") === "unavailable") {
    const { count } = await admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barber_profile_id", entry.barber_profile_id)
      .eq("location_id", entry.location_id)
      .lt("starts_at", entry.ends_at)
      .gt("ends_at", entry.starts_at)
      .in("status", activeAppointmentStatuses);
    conflicts = count ?? 0;
    if (conflicts > 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "APPOINTMENTS_EXIST",
          conflicts,
          message: `${conflicts} active appointment${conflicts === 1 ? "" : "s"} overlap this period. Reschedule or cancel them before approving the unavailable time.`,
        },
        { status: 409 },
      );
    }
  }

  const nextReason = parsed.data.note ? `${entry.status} → ${parsed.data.decision}: ${parsed.data.note}` : entry.reason;
  const { error } = await admin
    .from("barber_time_off")
    .update({
      status: parsed.data.decision,
      approved_by: session.user.id,
      reason: nextReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entry.id);

  if (error) return NextResponse.json({ ok: false, message: "The decision could not be saved." }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_user_id: session.user.id,
    action: `barber_time_off_${parsed.data.decision}`,
    resource_type: "barber_time_off",
    resource_id: entry.id,
    metadata: { conflicts, note: parsed.data.note ?? null },
  });

  const { data: barber } = await admin
    .from("barber_profiles")
    .select("business_id,staff_user_id,display_name,portal_email")
    .eq("id", entry.barber_profile_id)
    .maybeSingle();

  if (barber?.business_id) {
    const timezone = businessConfig.timezone;
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, dateStyle: "full", timeStyle: "short" });
    const when = `${formatter.format(new Date(entry.starts_at))} – ${formatter.format(new Date(entry.ends_at))}`;
    const barberName = String(barber.display_name || "Barber");
    const label = decisionLabel(parsed.data.decision);
    const body = `${barberName}'s availability request for ${when} was ${label}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ""}`;
    const jobs: Array<Record<string, unknown>> = [
      {
        business_id: barber.business_id,
        channel: "email",
        template_key: "barber_availability_admin_decision",
        locale: "en",
        recipient: businessConfig.bookingEmail,
        payload: { subject: `${barberName} availability ${label}`, body, transactional: true, availabilityEventId: entry.id, decision: parsed.data.decision },
        idempotency_key: `availability-decision-admin:${entry.id}:${parsed.data.decision}`,
        scheduled_for: new Date().toISOString(),
        status: "queued",
      },
    ];

    const barberEmail = String(barber.portal_email || "").trim();
    if (barberEmail) {
      jobs.push({
        business_id: barber.business_id,
        user_id: barber.staff_user_id,
        channel: "email",
        template_key: "barber_availability_admin_decision",
        locale: "en",
        recipient: barberEmail,
        payload: { subject: `Availability ${label}: ${when}`, body, transactional: true, availabilityEventId: entry.id, decision: parsed.data.decision },
        idempotency_key: `availability-decision-barber:${entry.id}:${parsed.data.decision}`,
        scheduled_for: new Date().toISOString(),
        status: "queued",
      });
    }

    await admin.from("notification_jobs").upsert(jobs, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
    await processNotificationJobs(admin, { limit: 10 }).catch((notificationError) => {
      console.error("availability-decision-notification-process", notificationError instanceof Error ? notificationError.message : "UNKNOWN");
    });
  }

  return NextResponse.json({ ok: true, conflicts, message: "Availability decision saved." });
}
