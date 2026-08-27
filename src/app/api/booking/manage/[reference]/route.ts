import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getManagedAppointment } from "@/lib/booking/manage";
import { searchSupabaseAvailability } from "@/lib/booking/availability";
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
  const duration = Number(appointment.service_duration_snapshot_minutes || 30);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: appointment.timezone || businessConfig.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(startsAt);
  const availability = await searchSupabaseAvailability({ locationId: appointment.location_id, serviceId: appointment.service_id, addonIds: [], durationMinutesOverride: duration, barberIds: [appointment.barber_profile_id], startDate: date, days: 1 });
  if (!availability.slots.some((slot) => slot.startsAt === startsAt.toISOString() && slot.barberId === appointment.barber_profile_id)) return NextResponse.json({ ok: false, code: "SLOT_TAKEN", message: "That time is no longer available." }, { status: 409 });
  const { data, error } = await admin.rpc("reschedule_appointment_atomic", { p_appointment_id: appointment.id, p_starts_at: startsAt.toISOString(), p_ends_at: endsAt.toISOString(), p_actor: null, p_actor_role: "guest", p_reason: "Guest rescheduled through secure manage link" });
  if (error || !data) return NextResponse.json({ ok: false, message: /SLOT_CONFLICT/.test(error?.message ?? "") ? "That time is no longer available." : "The appointment could not be rescheduled." }, { status: /SLOT_CONFLICT/.test(error?.message ?? "") ? 409 : 503 });
  await queueAppointmentChangeNotifications(
    admin,
    { ...appointment, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() } as Parameters<typeof queueAppointmentChangeNotifications>[1],
    "rescheduled",
  );
  return NextResponse.json({ ok: true, startsAt: startsAt.toISOString() });
}
