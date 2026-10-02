import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";
import { requestCorrelationId } from "@/lib/booking/observability";
import { moveAppointment } from "@/lib/booking/reschedule";
import { businessConfig } from "@/lib/config/business";

const mutationSchema = z.object({ appointmentId: z.string().uuid(), startsAt: z.string().datetime().optional() });
const immutableStatuses = new Set(["completed", "cancelled_by_client", "cancelled_by_business", "no_show", "declined", "expired", "failed"]);

type ClientAppointmentRecord = {
  id: string;
  business_id: string;
  auth_user_id: string | null;
  public_reference: string;
  client_email_snapshot: string | null;
  email_consent: boolean;
  starts_at: string;
  updated_at?: string | null;
};

async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.some((role) => ["client", "owner", "super_admin"].includes(role))) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  return supabase ? { session, supabase } : null;
}

async function ownedAppointment(value: Awaited<ReturnType<typeof context>>, appointmentId: string) {
  if (!value) return null;
  const { data } = await value.supabase.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
  return data?.id ? data : null;
}

export async function PATCH(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = mutationSchema.required({ startsAt: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose a valid future appointment time." }, { status: 422 });
  const appointment = await ownedAppointment(value, parsed.data.appointmentId);
  if (!appointment) return NextResponse.json({ ok: false, message: "The appointment is not available to this account." }, { status: 404 });
  if (immutableStatuses.has(String(appointment.status))) return NextResponse.json({ ok: false, message: "This appointment can no longer be changed online." }, { status: 409 });
  const startsAt = new Date(parsed.data.startsAt);
  if (!Number.isFinite(startsAt.getTime()) || startsAt.getTime() <= Date.now()) return NextResponse.json({ ok: false, message: "Choose a future appointment time." }, { status: 422 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Booking service is unavailable." }, { status: 503 });
  // Same atomic move the lounge uses: the whole booking keeps its length, the
  // old time is released and the new time is blocked together, and exactly one
  // notification is queued after the change is saved.
  const result = await moveAppointment(admin, {
    appointment,
    startsAt: startsAt.toISOString(),
    actorUserId: value.session.user.id,
    actorRole: "client",
    reason: "Client rescheduled through the portal",
    correlationId: requestCorrelationId(request.headers),
  });
  if (!result.ok) return NextResponse.json({ ok: false, code: result.reason, message: result.message }, { status: result.status });
  return NextResponse.json({ ok: true, startsAt: startsAt.toISOString() });
}

export async function DELETE(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = mutationSchema.pick({ appointmentId: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "A valid appointment is required." }, { status: 422 });
  const appointment = await ownedAppointment(value, parsed.data.appointmentId);
  if (!appointment) return NextResponse.json({ ok: false, message: "The appointment is not available to this account." }, { status: 404 });
  if (immutableStatuses.has(String(appointment.status))) return NextResponse.json({ ok: false, message: "This appointment can no longer be cancelled online." }, { status: 409 });
  const cutoff = new Date(appointment.starts_at).getTime() - businessConfig.cancellationCutoffHours * 60 * 60_000;
  if (Date.now() >= cutoff) return NextResponse.json({ ok: false, message: `Online cancellation closes ${businessConfig.cancellationCutoffHours} hours before the appointment. Call ${businessConfig.phone}.` }, { status: 409 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Booking service is unavailable." }, { status: 503 });
  const { error } = await admin.from("appointments").update({ status: "cancelled_by_client" }).eq("id", appointment.id);
  if (error) return NextResponse.json({ ok: false, message: "The appointment could not be cancelled." }, { status: 409 });
  await Promise.all([
    admin.from("appointment_status_history").insert({ appointment_id: appointment.id, booking_metadata_id: null, from_status: appointment.status, to_status: "cancelled_by_client", changed_by: value.session.user.id, reason: "Client cancelled through the portal", metadata: { source: "client_portal" } }),
    admin.from("audit_logs").insert({ business_id: appointment.business_id, actor_user_id: value.session.user.id, actor_role: "client", action: "booking.cancelled_by_client", resource_type: "appointment", resource_id: appointment.id, reason: "Client cancelled through the portal", before_data: { status: appointment.status }, after_data: { status: "cancelled_by_client" }, metadata: { reference: appointment.public_reference } }),
    queueClientUpdate(admin, appointment, "booking_cancelled", `Your appointment ${appointment.public_reference} was cancelled.`),
  ]);
  return NextResponse.json({ ok: true });
}

async function queueClientUpdate(admin: NonNullable<ReturnType<typeof createUntypedAdminSupabase>>, appointment: ClientAppointmentRecord, template: string, body: string) {
  if (!appointment.client_email_snapshot || !appointment.email_consent) return;
  await admin.from("notification_jobs").upsert({ business_id: appointment.business_id, user_id: appointment.auth_user_id, channel: "email", template_key: template, locale: "en", recipient: appointment.client_email_snapshot, payload: { subject: `Luxury Barber Lounge appointment update`, body, transactional: true, appointmentId: appointment.id, appointmentField: "client_confirmation_status" }, idempotency_key: `${template}:${appointment.id}:${appointment.updated_at ?? appointment.starts_at}`, scheduled_for: new Date().toISOString(), status: "queued" }, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
}
