import "server-only";

import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { absoluteUrl, businessConfig } from "@/lib/config/business";
import { processNotificationJobs } from "@/lib/notifications/process";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;

type AppointmentChange = {
  id: string;
  business_id: string;
  barber_profile_id: string;
  public_reference: string;
  client_name_snapshot: string;
  client_email_snapshot: string | null;
  service_name_snapshot: string;
  barber_name_snapshot: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  client_phone_snapshot?: string | null;
  sms_consent?: boolean | null;
  reschedule_count?: number | null;
  booking_kind?: string | null;
  party_size?: number | null;
};

type ChangeOptions = {
  /** Location name shown to the client. Falls back to the lounge address. */
  location?: string | null;
  /** Where the appointment was before the change, for the "moved from" line. */
  previousStartsAt?: string | null;
  /**
   * False when the caller must not wait for delivery. The job stays queued and
   * the notifications cron delivers it.
   */
  deliverNow?: boolean;
};

const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character] ?? character);
}

function when(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

type ChangeEvent = "cancelled" | "rescheduled" | "time_changed" | "barber_changed" | "updated";

function visit(appointment: AppointmentChange) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: appointment.timezone || businessConfig.timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(appointment.starts_at));
}

function label(event: ChangeEvent) {
  if (event === "cancelled") return "cancelled";
  if (event === "rescheduled" || event === "time_changed") return "rescheduled";
  if (event === "barber_changed") return "reassigned";
  return "updated";
}

function clientHtml(appointment: AppointmentChange, event: ChangeEvent, location: string, previous: string | null) {
  const action = label(event);
  const date = visit(appointment);
  const name = escapeHtml(appointment.client_name_snapshot);
  const service = escapeHtml(appointment.service_name_snapshot);
  const barber = escapeHtml(appointment.barber_name_snapshot);
  const previousRow = previous && event !== "cancelled"
    ? `<tr><td style="padding:10px;border-bottom:1px solid #292929">Previous time</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right;color:#999">${escapeHtml(previous)}</td></tr>`
    : "";
  return `<div style="margin:0;background:#090909;padding:30px 14px;font-family:Arial,sans-serif;color:#f4efe6"><div style="max-width:620px;margin:auto;border:1px solid #9d772e;background:#111;padding:30px"><p style="margin:0;color:#c99a3e;letter-spacing:3px;text-transform:uppercase;font-size:11px">Appointment ${action}</p><h1 style="font-family:Georgia,serif;font-weight:400;color:#fff">Your appointment has been ${action}.</h1><p style="color:#d5cec2;line-height:1.7">${name}, here are the latest details for your Luxury Barber Lounge appointment.</p><table style="width:100%;border-collapse:collapse;color:#f4efe6"><tr><td style="padding:10px;border-bottom:1px solid #292929">Reference</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${escapeHtml(appointment.public_reference)}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Service</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${service}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Barber</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${barber}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Location</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${escapeHtml(location)}</td></tr>${previousRow}<tr><td style="padding:10px">${event === "cancelled" ? "Original time" : "Updated time"}</td><td style="padding:10px;text-align:right">${date}</td></tr></table><p style="margin:24px 0"><a href="${absoluteUrl("/login?next=/client/appointments")}" style="display:inline-block;background:#c99a3e;color:#090909;padding:13px 20px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;font-size:11px">View appointments</a></p><p style="color:#999;font-size:13px;line-height:1.6">Questions? Call ${businessConfig.phone}.</p></div></div>`;
}

export async function queueAppointmentChangeNotifications(
  admin: AdminClient,
  appointment: AppointmentChange,
  event: ChangeEvent,
  options: ChangeOptions = {},
) {
  const action = label(event);
  const formatted = visit(appointment);
  const timeZone = appointment.timezone || businessConfig.timezone;
  const location = options.location?.trim() || `${businessConfig.name}, ${businessConfig.address.line1}, ${businessConfig.address.city}`;
  const previous = options.previousStartsAt && options.previousStartsAt !== appointment.starts_at ? when(options.previousStartsAt, timeZone) : null;
  const moved = event === "rescheduled" || event === "time_changed" || event === "barber_changed";
  // One notification per committed change. reschedule_count only increases when
  // the database actually moved the appointment, so a repeated request, a
  // double click or a retry reuses the same key and nothing is sent twice.
  // Moving A -> B -> A is three different counts, so each real move notifies.
  const eventKey = moved
    ? typeof appointment.reschedule_count === "number"
      ? `moved:${appointment.reschedule_count}`
      : `${event}:${appointment.starts_at}:${appointment.barber_profile_id}`
    : `${event}:${appointment.status}`;
  const jobs: Array<Record<string, unknown>> = [];

  if (appointment.client_email_snapshot) {
    jobs.push({
      business_id: appointment.business_id,
      channel: "email",
      template_key: `booking_${event}`,
      locale: "en",
      recipient: appointment.client_email_snapshot,
      payload: {
        subject: `Appointment ${action}: ${appointment.service_name_snapshot}`,
        body: `${appointment.client_name_snapshot}, your ${appointment.service_name_snapshot} appointment ${appointment.public_reference} has been ${action}. ${event === "cancelled" ? "Original appointment" : "Updated appointment"}: ${formatted} with ${appointment.barber_name_snapshot} at ${location}.${previous && event !== "cancelled" ? ` Previous time: ${previous}.` : ""} Questions? Call ${businessConfig.phone}.`,
        html: clientHtml(appointment, event, location, previous),
        transactional: true,
        appointmentId: appointment.id,
        event,
      },
      idempotency_key: `booking-change-client:${appointment.id}:${eventKey}`,
      scheduled_for: new Date().toISOString(),
      status: "queued",
    });
  }

  // Text message only when the client opted in to SMS on this booking. The
  // processor suppresses it while no SMS provider is configured.
  if (appointment.client_phone_snapshot && appointment.sms_consent === true) {
    jobs.push({
      business_id: appointment.business_id,
      channel: "sms",
      template_key: `booking_${event}_sms`,
      locale: "en",
      recipient: appointment.client_phone_snapshot,
      payload: {
        body: `Luxury Barber Lounge: appointment ${appointment.public_reference} was ${action}. ${event === "cancelled" ? "Was" : "Now"} ${formatted} with ${appointment.barber_name_snapshot}. ${businessConfig.phone}`,
        transactional: true,
        smsConsent: true,
        appointmentId: appointment.id,
        event,
      },
      idempotency_key: `booking-change-client-sms:${appointment.id}:${eventKey}`,
      scheduled_for: new Date().toISOString(),
      status: "queued",
    });
  }

  jobs.push({
    business_id: appointment.business_id,
    channel: "email",
    template_key: `booking_admin_${event}`,
    locale: "en",
    recipient: businessConfig.bookingEmail,
    payload: {
      subject: `${appointment.client_name_snapshot} appointment ${action}`,
      body: `${appointment.public_reference} · ${appointment.service_name_snapshot} · ${appointment.barber_name_snapshot} · ${formatted} · status ${appointment.status}. Open ${absoluteUrl(`/admin/appointments?reference=${encodeURIComponent(appointment.public_reference)}`)}.`,
      transactional: true,
      appointmentId: appointment.id,
      event,
    },
    idempotency_key: `booking-change-admin:${appointment.id}:${eventKey}`,
    scheduled_for: new Date().toISOString(),
    status: "queued",
  });

  const { data: barberProfile } = await admin
    .from("barber_profiles")
    .select("staff_user_id,portal_email")
    .eq("id", appointment.barber_profile_id)
    .eq("business_id", appointment.business_id)
    .maybeSingle();

  const staffUserId = typeof barberProfile?.staff_user_id === "string" ? barberProfile.staff_user_id : null;
  const authUser = staffUserId ? await admin.auth.admin.getUserById(staffUserId) : null;
  const barberEmail = String(barberProfile?.portal_email || authUser?.data.user?.email || "").trim();

  if (barberEmail) {
    jobs.push({
      business_id: appointment.business_id,
      user_id: staffUserId,
      channel: "email",
      template_key: `barber_booking_${event}`,
      locale: "en",
      recipient: barberEmail,
      payload: {
        subject: `Appointment ${action}: ${appointment.client_name_snapshot}`,
        body: `${appointment.client_name_snapshot}'s ${appointment.service_name_snapshot} appointment ${appointment.public_reference} has been ${action}. ${formatted}.`,
        transactional: true,
        appointmentId: appointment.id,
        event,
      },
      idempotency_key: `booking-change-barber:${appointment.id}:${eventKey}`,
      scheduled_for: new Date().toISOString(),
      status: "queued",
    });
  }

  const queued = await admin.from("notification_jobs").upsert(jobs, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
  if (queued.error) {
    // The appointment change is already committed and must stay committed.
    console.error("appointment-change-notification-queue", { appointmentId: appointment.id, event, code: queued.error.code });
    return { queued: false };
  }
  if (options.deliverNow === false) return { queued: true };
  await processNotificationJobs(admin, { appointmentId: appointment.id, limit: 12 }).catch((error) => {
    console.error("appointment-change-notification-process", error instanceof Error ? error.message : "UNKNOWN");
  });
  return { queued: true };
}
