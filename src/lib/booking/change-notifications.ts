import "server-only";

import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { absoluteUrl, businessConfig } from "@/lib/config/business";
import { processNotificationJobs } from "@/lib/notifications/process";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;

type AppointmentChange = {
  id: string;
  business_id: string;
  public_reference: string;
  client_name_snapshot: string;
  client_email_snapshot: string | null;
  service_name_snapshot: string;
  barber_name_snapshot: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  assigned_staff_user_id: string | null;
};

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

function clientHtml(appointment: AppointmentChange, event: ChangeEvent) {
  const action = label(event);
  const date = visit(appointment);
  return `<div style="margin:0;background:#090909;padding:30px 14px;font-family:Arial,sans-serif;color:#f4efe6"><div style="max-width:620px;margin:auto;border:1px solid #9d772e;background:#111;padding:30px"><p style="margin:0;color:#c99a3e;letter-spacing:3px;text-transform:uppercase;font-size:11px">Appointment ${action}</p><h1 style="font-family:Georgia,serif;font-weight:400;color:#fff">Your appointment has been ${action}.</h1><p style="color:#d5cec2;line-height:1.7">${appointment.client_name_snapshot}, here are the latest details for your Luxury Barber Lounge appointment.</p><table style="width:100%;border-collapse:collapse;color:#f4efe6"><tr><td style="padding:10px;border-bottom:1px solid #292929">Reference</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${appointment.public_reference}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Service</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${appointment.service_name_snapshot}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Barber</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${appointment.barber_name_snapshot}</td></tr><tr><td style="padding:10px">${event === "cancelled" ? "Original time" : "Updated time"}</td><td style="padding:10px;text-align:right">${date}</td></tr></table><p style="margin:24px 0"><a href="${absoluteUrl("/login?next=/client/appointments")}" style="display:inline-block;background:#c99a3e;color:#090909;padding:13px 20px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;font-size:11px">View appointments</a></p><p style="color:#999;font-size:13px;line-height:1.6">Questions? Call ${businessConfig.phone}.</p></div></div>`;
}

export async function queueAppointmentChangeNotifications(
  admin: AdminClient,
  appointment: AppointmentChange,
  event: ChangeEvent,
) {
  const action = label(event);
  const formatted = visit(appointment);
  const eventKey = event === "rescheduled" || event === "time_changed"
    ? `${event}:${appointment.starts_at}`
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
        body: `${appointment.client_name_snapshot}, your ${appointment.service_name_snapshot} appointment ${appointment.public_reference} has been ${action}. ${event === "cancelled" ? "Original appointment" : "Updated appointment"}: ${formatted} with ${appointment.barber_name_snapshot}.`,
        html: clientHtml(appointment, event),
        transactional: true,
        appointmentId: appointment.id,
        event,
      },
      idempotency_key: `booking-change-client:${appointment.id}:${eventKey}`,
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

  if (appointment.assigned_staff_user_id) {
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(appointment.assigned_staff_user_id),
      admin.from("barber_profiles").select("portal_email").eq("staff_user_id", appointment.assigned_staff_user_id).maybeSingle(),
    ]);
    const barberEmail = String(profile?.portal_email || authUser.user?.email || "").trim();
    if (barberEmail) {
      jobs.push({
        business_id: appointment.business_id,
        user_id: appointment.assigned_staff_user_id,
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
  }

  if (!jobs.length) return;
  await admin.from("notification_jobs").upsert(jobs, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
  await processNotificationJobs(admin, { appointmentId: appointment.id, limit: 12 }).catch((error) => {
    console.error("appointment-change-notification-process", error instanceof Error ? error.message : "UNKNOWN");
  });
}
