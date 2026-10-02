import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { requestCorrelationId, schedulingErrorMessage, schedulingErrorReason, schedulingErrorStatus } from "@/lib/booking/observability";
import { moveAppointment } from "@/lib/booking/reschedule";
import { addDays, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";
import { sendFormSubmitBooking } from "@/lib/email/formsubmit";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const operatingRoles = ["receptionist", "manager", "owner", "super_admin"] as const;
const adminVisibleStatuses = ["confirmed", "checked_in", "assigned", "in_service", "completed", "cancelled_by_client", "cancelled_by_business", "no_show", "rescheduled"] as const;
type OperationalAppointmentRecord = {
  id: string;
  business_id: string;
  location_id: string;
  auth_user_id: string | null;
  public_reference: string;
  client_name_snapshot: string;
  client_phone_snapshot: string | null;
  service_id: string;
  assigned_staff_user_id: string | null;
  barber_name_snapshot: string;
  sms_consent: boolean;
};

const actionSchema = z.object({
  appointmentId: z.string().uuid(),
  action: z.enum(["confirm", "decline", "cancel", "check_in", "assign", "in_service", "complete", "no_show", "reschedule", "reassign", "note", "retry_formsubmit"]),
  reason: z.string().trim().max(500).optional(),
  startsAt: z.string().datetime().optional(),
  barberProfileId: z.string().uuid().optional(),
  note: z.string().trim().min(1).max(2000).optional(),
  clientVisible: z.boolean().optional(),
});

async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => operatingRoles.includes(role as (typeof operatingRoles)[number]))) return null;
  const admin = createUntypedAdminSupabase();
  if (!admin) return null;
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return null;
  return { session, admin, businessId: String(business.id), actorRole: session.roles.find((role) => operatingRoles.includes(role as never)) ?? "manager" };
}

export async function GET(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Shop access is required." }, { status: 403 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const barber = url.searchParams.get("barber");
  let from = url.searchParams.get("from");
  let to = url.searchParams.get("to");
  const date = url.searchParams.get("date");
  const source = url.searchParams.get("source");
  const reference = url.searchParams.get("reference");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    from = zonedDateTimeToUtc(date, "00:00:00", businessConfig.timezone).toISOString();
    to = zonedDateTimeToUtc(addDays(date, 1), "00:00:00", businessConfig.timezone).toISOString();
  }
  let query = value.admin
    .from("appointments")
    .select("id,public_reference,client_id,auth_user_id,service_id,barber_profile_id,assigned_staff_user_id,service_name_snapshot,service_price_snapshot_cents,service_duration_snapshot_minutes,addon_snapshot,barber_name_snapshot,client_name_snapshot,client_email_snapshot,client_phone_snapshot,starts_at,ends_at,timezone,status,client_declared_status,booking_source,campaign_source,referral_source,deposit_required_cents,deposit_status,client_notes,internal_notes,formsubmit_status,client_confirmation_status,barber_notification_status,sync_status,created_at,updated_at,booking_kind,party_size,completed_at,reschedule_count")
    .eq("business_id", value.businessId)
    // The operational Appointments workspace is the paid schedule, not the
    // checkout-hold inbox. Unpaid/pending website bookings remain in the
    // database for Square reconciliation, but are deliberately invisible here
    // until the payment webhook has verified the full service principal and
    // promoted the appointment to a confirmed lifecycle state.
    .eq("deposit_status", "paid")
    .in("status", [...adminVisibleStatuses])
    .order("starts_at", { ascending: true })
    .limit(300);
  if (status && status !== "all") query = query.eq("status", status);
  if (barber) query = query.eq("barber_profile_id", barber);
  if (source && source !== "all") query = query.eq("booking_source", source);
  if (reference) query = query.eq("public_reference", reference);
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lt("starts_at", to);
  const [{ data: appointments, error }, { data: barbers }, { data: deliveryRows }] = await Promise.all([
    query,
    value.admin.from("barber_profiles").select("id,display_name,active,status,staff_user_id").eq("business_id", value.businessId).eq("active", true).neq("status", "archived").order("sort_order"),
    value.admin.from("formsubmit_deliveries").select("appointment_id,status,attempt_count,last_error,sent_at,next_attempt_at,updated_at").order("updated_at", { ascending: false }).limit(500),
  ]);
  if (error) return NextResponse.json({ ok: false, message: "Appointments could not be loaded." }, { status: 503 });
  const deliveries = new Map((deliveryRows ?? []).map((row) => [String(row.appointment_id), row]));
  const rows = (appointments ?? []).map((appointment) => ({ ...appointment, formsubmit_delivery: deliveries.get(String(appointment.id)) ?? null }));
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: businessConfig.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const summary = rows.reduce((result, row) => {
    result.total += 1;
    result[row.status] = (result[row.status] ?? 0) + 1;
    const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: row.timezone || businessConfig.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(row.starts_at));
    if (localDate === today) result.today += 1;
    return result;
  }, { total: 0, today: 0 } as Record<string, number>);
  return NextResponse.json({ ok: true, appointments: rows, barbers: barbers ?? [], summary });
}

export async function PATCH(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Shop access is required." }, { status: 403 });
  const correlationId = requestCorrelationId(request.headers);
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the requested appointment change." }, { status: 422 });
  const input = parsed.data;
  const { data: appointment } = await value.admin.from("appointments").select("*").eq("business_id", value.businessId).eq("id", input.appointmentId).maybeSingle();
  if (!appointment?.id) return NextResponse.json({ ok: false, message: "Appointment not found." }, { status: 404 });

  if (input.action === "confirm") {
    const requiredPrincipal = Math.max(0, Number(appointment.service_price_snapshot_cents ?? 0));
    if (requiredPrincipal > 0) {
      const { data: paidLinks, error: paidLinksError } = await value.admin
        .from("appointment_payment_links")
        .select("amount_cents")
        .eq("appointment_id", appointment.id)
        .eq("status", "paid")
        .in("purpose", ["deposit", "balance"]);
      if (paidLinksError) return NextResponse.json({ ok: false, message: "Payment verification is temporarily unavailable." }, { status: 503 });
      const paidPrincipal = (paidLinks ?? []).reduce((sum, link) => sum + Math.max(0, Number(link.amount_cents ?? 0)), 0);
      if (appointment.deposit_status !== "paid" || paidPrincipal < requiredPrincipal) {
        return NextResponse.json({ ok: false, message: "This booking cannot be confirmed until the client has paid the full service amount." }, { status: 409 });
      }
    }
  }

  if (input.action === "note") {
    if (!input.note) return NextResponse.json({ ok: false, message: "Write a note first." }, { status: 422 });
    const { error } = await value.admin.from("appointment_notes").insert({ appointment_id: appointment.id, booking_metadata_id: null, author_user_id: value.session.user.id, note: input.note, client_visible: Boolean(input.clientVisible) });
    if (error) return NextResponse.json({ ok: false, message: "The note could not be saved." }, { status: 503 });
    await audit(value, appointment, "booking.note_added", input.reason || "Appointment note added", null, { client_visible: Boolean(input.clientVisible) });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "retry_formsubmit") {
    const { data: existingDelivery } = await value.admin
      .from("formsubmit_deliveries")
      .select("attempt_count")
      .eq("appointment_id", appointment.id)
      .maybeSingle();
    const result = await sendFormSubmitBooking(appointment);
    const next = ["failed", "awaiting_activation"].includes(result.status) ? new Date(Date.now() + 10 * 60_000).toISOString() : null;
    await value.admin.from("formsubmit_deliveries").upsert({ appointment_id: appointment.id, recipient_email: businessConfig.bookingEmail, subject: `New Booking: ${appointment.client_name_snapshot} • ${appointment.service_name_snapshot}`, status: result.status, attempt_count: Number(existingDelivery?.attempt_count ?? 0) + 1, response_status: result.responseStatus, sanitized_response: result.response, last_error: result.error, sent_at: result.status === "sent" ? new Date().toISOString() : null, next_attempt_at: next }, { onConflict: "appointment_id" });
    await value.admin.from("appointments").update({ formsubmit_status: result.status }).eq("id", appointment.id);
    await audit(value, appointment, result.status === "sent" ? "booking.formsubmit_sent" : "booking.formsubmit_failed", input.reason || "Administrative booking email retried", null, { status: result.status });
    return NextResponse.json({ ok: result.status === "sent", status: result.status, message: result.status === "sent" ? "Administrative email sent." : "The booking remains saved; delivery will retry." }, { status: result.status === "sent" ? 200 : 202 });
  }

  if (input.action === "reschedule" || input.action === "reassign") {
    // Both actions go through the same atomic move: the old time is released
    // and the new time is blocked in one transaction, or nothing changes.
    if (input.action === "reschedule" && !input.startsAt) return NextResponse.json({ ok: false, message: "Choose a new date and time." }, { status: 422 });
    if (input.action === "reassign" && !input.barberProfileId) return NextResponse.json({ ok: false, message: "Choose an active barber." }, { status: 422 });
    if (input.action === "reassign" && input.barberProfileId && ["checked_in", "assigned", "in_service"].includes(String(appointment.status))) {
      return reassignInService(value, appointment, input.barberProfileId, input.reason, correlationId);
    }
    const { data: location } = await value.admin.from("locations").select("name").eq("id", appointment.location_id).maybeSingle();
    const result = await moveAppointment(value.admin, {
      appointment,
      startsAt: input.startsAt ?? appointment.starts_at,
      barberProfileId: input.barberProfileId ?? null,
      actorUserId: value.session.user.id,
      actorRole: value.actorRole,
      reason: input.reason || (input.action === "reassign" ? "Reassigned by shop" : "Rescheduled by shop"),
      correlationId,
      locationName: typeof location?.name === "string" ? location.name : null,
    });
    if (!result.ok) return NextResponse.json({ ok: false, code: result.reason, message: result.message }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ ok: true, changed: result.changed, appointment: result.appointment, clientNotified: result.notificationQueued }, { headers: NO_STORE });
  }

  if (input.action === "complete") {
    // Finish: records the real completion time and releases the unused part of
    // the reservation. A second click returns the same row and changes nothing.
    const { data, error } = await value.admin.rpc("complete_appointment_atomic", {
      p_appointment_id: appointment.id,
      p_actor: value.session.user.id,
      p_actor_role: value.actorRole,
      p_reason: input.reason || null,
    });
    if (error || !data) {
      const reason = schedulingErrorReason(error);
      console.warn("booking-finish", { correlationId, appointmentId: appointment.id, actorRole: value.actorRole, reason, code: error?.code ?? null });
      return NextResponse.json({ ok: false, code: reason, message: schedulingErrorMessage(reason) }, { status: schedulingErrorStatus(reason), headers: NO_STORE });
    }
    const completed = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    console.info("booking-finish", { correlationId, appointmentId: appointment.id, actorRole: value.actorRole, duplicate: appointment.status === "completed", completedAt: completed.completed_at, availableAgainAt: completed.occupied_until });
    return NextResponse.json({ ok: true, status: "completed", duplicate: appointment.status === "completed", completedAt: completed.completed_at, availableAgainAt: completed.occupied_until }, { headers: NO_STORE });
  }

  if (input.action === "confirm") {
    // Payment was verified above. The database decides whether the time is
    // still free, so an expired hold can never be confirmed on top of someone.
    const { data, error } = await value.admin.rpc("confirm_paid_appointment", { p_appointment_id: appointment.id, p_actor: value.session.user.id, p_source: "admin_dashboard" });
    if (error || !data) {
      const reason = schedulingErrorReason(error);
      console.warn("booking-confirm", { correlationId, appointmentId: appointment.id, reason, code: error?.code ?? null });
      return NextResponse.json({ ok: false, code: reason, message: schedulingErrorMessage(reason) }, { status: schedulingErrorStatus(reason), headers: NO_STORE });
    }
    const outcome = data as { promoted?: boolean; appointment?: { status?: string } };
    if (outcome.promoted) await audit(value, appointment, "booking.confirmed", input.reason || "Appointment confirmed", { status: appointment.status }, { status: "confirmed" });
    if (outcome.appointment?.status !== "confirmed") return NextResponse.json({ ok: false, message: `The appointment cannot move from ${String(appointment.status).replaceAll("_", " ")} to confirmed.` }, { status: 409, headers: NO_STORE });
    return NextResponse.json({ ok: true, status: "confirmed", duplicate: !outcome.promoted }, { headers: NO_STORE });
  }

  const nextStatus: Record<string, string> = {
    decline: "declined",
    cancel: "cancelled_by_business",
    check_in: "checked_in",
    assign: "assigned",
    in_service: "in_service",
    no_show: "no_show",
  };
  const status = nextStatus[input.action];
  if (!status) return NextResponse.json({ ok: false, message: "Unsupported appointment action." }, { status: 400 });
  if (appointment.status === status) return NextResponse.json({ ok: true, duplicate: true });
  const { error } = await value.admin.from("appointments").update({ status }).eq("id", appointment.id);
  if (error) return NextResponse.json({ ok: false, message: /INVALID_APPOINTMENT_STATUS_TRANSITION/.test(error.message) ? `The appointment cannot move from ${appointment.status.replaceAll("_", " ")} to ${status.replaceAll("_", " ")}.` : "The appointment status could not be updated." }, { status: 409 });
  await Promise.all([
    value.admin.from("appointment_status_history").insert({ appointment_id: appointment.id, booking_metadata_id: null, from_status: appointment.status, to_status: status, changed_by: value.session.user.id, reason: input.reason || `Appointment ${status.replaceAll("_", " ")}`, metadata: { source: "admin_dashboard" } }),
    audit(value, appointment, `booking.${status}`, input.reason || `Appointment ${status.replaceAll("_", " ")}`, { status: appointment.status }, { status }),
  ]);
  if (input.action === "check_in") await checkInQueue(value, appointment);
  return NextResponse.json({ ok: true, status });
}

/**
 * A client who is already in the lounge keeps the same time and status and is
 * handed to another barber. The database guard validates the new barber's
 * calendar inside the same statement, so this cannot double-book either.
 */
async function reassignInService(value: NonNullable<Awaited<ReturnType<typeof context>>>, appointment: OperationalAppointmentRecord & Record<string, unknown>, barberProfileId: string, reasonText: string | undefined, correlationId: string) {
  const [{ data: barber }, { data: eligible }] = await Promise.all([
    value.admin.from("barber_profiles").select("id,display_name,staff_user_id,active,status").eq("business_id", value.businessId).eq("id", barberProfileId).eq("active", true).neq("status", "archived").maybeSingle(),
    value.admin.from("barber_profile_services").select("barber_profile_id").eq("barber_profile_id", barberProfileId).eq("service_id", appointment.service_id).eq("active", true).maybeSingle(),
  ]);
  if (!barber?.id || !eligible) return NextResponse.json({ ok: false, code: "barber_not_eligible", message: schedulingErrorMessage("barber_not_eligible") }, { status: 409, headers: NO_STORE });
  const before = { barber_profile_id: appointment.barber_profile_id, barber_name_snapshot: appointment.barber_name_snapshot };
  const displayName = typeof barber.display_name === "string" ? barber.display_name : String((barber.display_name as Record<string, unknown> | null)?.en ?? "Barber");
  const { error } = await value.admin.from("appointments").update({ barber_profile_id: barber.id, assigned_staff_user_id: barber.staff_user_id ?? null, barber_name_snapshot: displayName }).eq("id", appointment.id);
  if (error) {
    const reason = schedulingErrorReason(error);
    console.warn("booking-reassign", { correlationId, appointmentId: appointment.id, toBarber: barberProfileId, reason, code: error.code ?? null });
    return NextResponse.json({ ok: false, code: reason, message: schedulingErrorMessage(reason) }, { status: schedulingErrorStatus(reason), headers: NO_STORE });
  }
  await value.admin.from("appointment_assignments").update({ active: false, released_at: new Date().toISOString() }).eq("appointment_id", appointment.id).eq("active", true);
  await value.admin.from("appointment_assignments").insert({ appointment_id: appointment.id, barber_profile_id: barber.id, assigned_staff_user_id: barber.staff_user_id ?? null, assignment_source: "admin", reason: reasonText || "Reassigned by shop", assigned_by: value.session.user.id });
  await audit(value, appointment, "booking.barber_reassigned", reasonText || "Barber reassigned", before, { barber_profile_id: barber.id, barber_name_snapshot: displayName });
  return NextResponse.json({ ok: true, changed: true }, { headers: NO_STORE });
}

async function checkInQueue(value: NonNullable<Awaited<ReturnType<typeof context>>>, appointment: OperationalAppointmentRecord) {
  const { data: existing } = await value.admin.from("queue_entries").select("id").eq("appointment_id", appointment.id).in("status", ["waiting", "confirmed", "checked_in", "assigned", "called", "ready", "in_service"]).maybeSingle();
  if (existing?.id) return;
  const publicToken = randomBytes(4).toString("hex").toUpperCase();
  const { data: row } = await value.admin.from("queue_entries").insert({ business_id: appointment.business_id, location_id: appointment.location_id, appointment_id: appointment.id, client_id: appointment.auth_user_id, client_name: appointment.client_name_snapshot, client_phone: appointment.client_phone_snapshot, service_id: appointment.service_id, service_slug: null, preferred_barber_id: appointment.assigned_staff_user_id, barber_preference: appointment.barber_name_snapshot, public_token: publicToken, status: "checked_in", estimated_wait_minutes: 0, attribution_source: "scheduled_appointment", metadata: { source: "appointment_check_in", appointment_reference: appointment.public_reference, smsConsent: appointment.sms_consent } }).select("id").single();
  if (row?.id) await value.admin.from("queue_status_history").insert({ queue_entry_id: row.id, from_status: null, to_status: "checked_in", changed_by: value.session.user.id, note: "Scheduled appointment checked in" });
}

async function audit(value: NonNullable<Awaited<ReturnType<typeof context>>>, appointment: OperationalAppointmentRecord, action: string, reason: string, before: unknown, after: unknown) {
  await value.admin.from("audit_logs").insert({ business_id: value.businessId, actor_user_id: value.session.user.id, actor_role: value.actorRole, action, resource_type: "appointment", resource_id: appointment.id, reason, before_data: before, after_data: after, metadata: { reference: appointment.public_reference } });
}
