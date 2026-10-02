import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getManagedAppointment } from "@/lib/booking/manage";
import { requestCorrelationId } from "@/lib/booking/observability";
import { moveAppointment } from "@/lib/booking/reschedule";
import { queueAppointmentChangeNotifications } from "@/lib/booking/change-notifications";
import { businessConfig } from "@/lib/config/business";

const schema = z.object({ action: z.enum(["cancel", "reschedule"]), startsAt: z.string().datetime().optional() });

export async function GET(request: NextRequest, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;
  const managed = await getManagedAppointment(reference, request.nextUrl.searchParams.get("token") ?? "");
  if (!managed) return NextResponse.json({ ok: false }, { status: 404 });
  const { manage_token_hash, client_email_snapshot, client_phone_snapshot, internal_notes, ...appointment } = managed.appointment;
  void manage_token_hash; void client_email_snapshot; void client_phone_snapshot; void internal_notes;
  return NextResponse.json({ ok: true, appointment, location: managed.location }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const managed = await getManagedAppointment(reference, token);
  if (!managed) return NextResponse.json({ ok: false, message: "This secure appointment link is invalid or expired." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the appointment change." }, { status: 422 });
  const { appointment, admin } = managed;
  if (["completed", "cancelled_by_client", "cancelled_by_business", "no_show", "declined", "expired", "failed"].includes(appointment.status)) return NextResponse.json({ ok: false, message: "This appointment can no longer be changed online." }, { status: 409 });

  if (parsed.data.action === "cancel") {
    const cutoff = new Date(appointment.starts_at).getTime() - businessConfig.cancellationCutoffHours * 60 * 60_000;
    if (Date.now() >= cutoff) return NextResponse.json({ ok: false, message: `Online cancellation closes ${businessConfig.cancellationCutoffHours} hours before the appointment. Call ${businessConfig.phone}.` }, { status: 409 });
    const { error } = await admin.from("appointments").update({ status: "cancelled_by_client" }).eq("id", appointment.id);
    if (error) return NextResponse.json({ ok: false, message: "The appointment could not be cancelled." }, { status: 409 });
    await Promise.all([
      admin.from("appointment_status_history").insert({ appointment_id: appointment.id, booking_metadata_id: null, from_status: appointment.status, to_status: "cancelled_by_client", changed_by: null, reason: "Guest cancelled through secure manage link", metadata: { source: "secure_manage_link" } }),
      admin.from("audit_logs").insert({ business_id: appointment.business_id, actor_user_id: null, actor_role: "guest", action: "booking.cancelled_by_client", resource_type: "appointment", resource_id: appointment.id, reason: "Guest cancelled through secure manage link", before_data: { status: appointment.status }, after_data: { status: "cancelled_by_client" }, metadata: { reference: appointment.public_reference } }),
    ]);
    await queueAppointmentChangeNotifications(
      admin,
      { ...appointment, status: "cancelled_by_client" } as Parameters<typeof queueAppointmentChangeNotifications>[1],
      "cancelled",
    );
    return NextResponse.json({ ok: true, status: "cancelled_by_client" });
  }

  if (!parsed.data.startsAt) return NextResponse.json({ ok: false, message: "Choose a new date and time." }, { status: 422 });
  const startsAt = new Date(parsed.data.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return NextResponse.json({ ok: false, message: "Choose a new date and time." }, { status: 422 });
  const result = await moveAppointment(admin, {
    appointment,
    startsAt: startsAt.toISOString(),
    actorUserId: null,
    actorRole: "guest",
    reason: "Guest rescheduled through secure manage link",
    correlationId: requestCorrelationId(request.headers),
    locationName: managed.location?.name ?? null,
  });
  if (!result.ok) return NextResponse.json({ ok: false, code: result.reason, message: result.message }, { status: result.status });
  return NextResponse.json({ ok: true, startsAt: startsAt.toISOString() });
}
