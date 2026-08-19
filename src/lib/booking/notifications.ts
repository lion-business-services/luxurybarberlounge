import "server-only";
import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { absoluteUrl, businessConfig } from "@/lib/config/business";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;
type Appointment = {
  id: string;
  business_id: string;
  deposit_required_cents?: number | null;
  deposit_status?: string | null;
  service_price_snapshot_cents?: number | null;
  public_reference: string;
  client_name_snapshot: string;
  client_email_snapshot: string | null;
  client_phone_snapshot: string | null;
  service_name_snapshot: string;
  barber_name_snapshot: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
  email_consent: boolean;
  sms_consent: boolean;
  assigned_staff_user_id: string | null;
};

function visit(appointment: Appointment) {
  return new Intl.DateTimeFormat("en-US", { timeZone: appointment.timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(appointment.starts_at));
}

function clientHtml(appointment: Appointment, manageToken: string) {
  // When no raw token is available (deposit-settled confirmations), link to the
  // client portal rather than emitting a tokenised URL that would not validate.
  const manageUrl = manageToken
    ? absoluteUrl(`/booking/confirmation/${encodeURIComponent(appointment.public_reference)}?token=${encodeURIComponent(manageToken)}`)
    : absoluteUrl(`/login?next=/client/appointments`);
  return `<div style="margin:0;background:#090909;padding:36px 16px;font-family:Arial,sans-serif;color:#f4efe6"><div style="max-width:620px;margin:auto;border:1px solid #9d772e;background:#111;padding:34px"><p style="color:#c99a3e;letter-spacing:3px;text-transform:uppercase;font-size:12px">Appointment confirmed</p><h1 style="font-family:Georgia,serif;font-weight:400;color:#fff">Your chair is reserved.</h1><p style="color:#d5cec2;line-height:1.7">${appointment.client_name_snapshot}, your appointment at Luxury Barber Lounge is confirmed.</p><table style="width:100%;border-collapse:collapse;color:#f4efe6"><tr><td style="padding:10px;border-bottom:1px solid #292929">Reference</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${appointment.public_reference}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Service</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${appointment.service_name_snapshot}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Barber</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${appointment.barber_name_snapshot}</td></tr><tr><td style="padding:10px;border-bottom:1px solid #292929">Date & time</td><td style="padding:10px;border-bottom:1px solid #292929;text-align:right">${visit(appointment)}</td></tr><tr><td style="padding:10px">Location</td><td style="padding:10px;text-align:right">${businessConfig.address.line1}, ${businessConfig.address.city}, ${businessConfig.address.region}</td></tr></table>${(() => {
    const price = Number(appointment.service_price_snapshot_cents ?? 0);
    const paid = Number(appointment.deposit_required_cents ?? 0);
    const balance = Math.max(0, price - paid);
    if (balance <= 0) return "";
    const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    return `<div style="margin:26px 0;padding:18px;border:1px solid #9d772e;background:#0d0d0d">
      <p style="margin:0 0 6px;color:#c99a3e;letter-spacing:2px;text-transform:uppercase;font-size:11px">Balance due at your visit</p>
      <p style="margin:0 0 4px;color:#f4efe6;font-size:22px;font-family:Georgia,serif">${money(balance)}</p>
      <p style="margin:0 0 14px;color:#999;font-size:13px;line-height:1.6">You paid ${money(paid)} today. The remaining ${money(balance)} is due when you visit ${appointment.barber_name_snapshot}. You can settle it now to skip payment at the chair.</p>
      <a href="${absoluteUrl(`/booking/confirmation/${encodeURIComponent(appointment.public_reference)}?token=${encodeURIComponent(manageToken)}&pay=balance`)}" style="display:inline-block;background:#c99a3e;color:#090909;padding:12px 20px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;font-size:12px">Pay balance now</a>
    </div>`;
  })()}<p style="margin:26px 0"><a href="${manageUrl}" style="display:inline-block;background:#c99a3e;color:#090909;padding:14px 22px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;font-size:12px">Manage appointment</a></p><p style="color:#999;font-size:13px;line-height:1.6">Questions? Call ${businessConfig.phone}.</p></div></div>`;
}

export async function queueBookingNotifications(admin: AdminClient, appointment: Appointment, manageToken: string) {
  // Do not tell the client their appointment is confirmed while the deposit is
  // still outstanding. These notifications are re-queued by the Square payment
  // webhook once the deposit settles.
  const depositOutstanding =
    Number(appointment.deposit_required_cents ?? 0) > 0 &&
    appointment.deposit_status !== "paid";
  if (depositOutstanding) return;

  const formatted = visit(appointment);
  const jobs: Array<Record<string, unknown>> = [];
  if (appointment.client_email_snapshot && appointment.email_consent) {
    jobs.push({ business_id: appointment.business_id, channel: "email", template_key: "booking_confirmed", locale: "en", recipient: appointment.client_email_snapshot, payload: { subject: `Confirmed: ${appointment.service_name_snapshot} at Luxury Barber Lounge`, body: `Your appointment ${appointment.public_reference} is confirmed for ${formatted} with ${appointment.barber_name_snapshot}.`, html: clientHtml(appointment, manageToken), transactional: true, appointmentId: appointment.id, appointmentField: "client_confirmation_status" }, idempotency_key: `booking-confirmed:${appointment.id}`, scheduled_for: new Date().toISOString(), status: "queued" });
    const reminder24 = new Date(new Date(appointment.starts_at).getTime() - 24 * 60 * 60 * 1000);
    if (reminder24 > new Date()) jobs.push({ business_id: appointment.business_id, channel: "email", template_key: "booking_reminder_24h", locale: "en", recipient: appointment.client_email_snapshot, payload: { subject: `Tomorrow: ${appointment.service_name_snapshot} at Luxury Barber Lounge`, body: `Reminder: ${appointment.service_name_snapshot} with ${appointment.barber_name_snapshot} is scheduled for ${formatted}. Call ${businessConfig.phone} if you need assistance.`, transactional: true, appointmentId: appointment.id }, idempotency_key: `booking-reminder-24h:${appointment.id}`, scheduled_for: reminder24.toISOString(), status: "queued" });
  }
  if (appointment.client_phone_snapshot && appointment.sms_consent) jobs.push({ business_id: appointment.business_id, channel: "sms", template_key: "booking_confirmed_sms", locale: "en", recipient: appointment.client_phone_snapshot, payload: { body: `Luxury Barber Lounge: ${appointment.public_reference} is confirmed for ${formatted} with ${appointment.barber_name_snapshot}. ${businessConfig.phone}`, transactional: true, appointmentId: appointment.id }, idempotency_key: `booking-confirmed-sms:${appointment.id}`, scheduled_for: new Date().toISOString(), status: "queued" });
  if (process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY) jobs.push({ business_id: appointment.business_id, channel: "email", template_key: "booking_admin_fallback", locale: "en", recipient: businessConfig.bookingEmail, payload: { subject: `Booking saved: ${appointment.client_name_snapshot} • ${appointment.service_name_snapshot}`, body: `Booking ${appointment.public_reference} was saved for ${formatted} with ${appointment.barber_name_snapshot}. Open ${absoluteUrl(`/admin/appointments?reference=${appointment.public_reference}`)}.`, transactional: true, appointmentId: appointment.id }, idempotency_key: `booking-admin-fallback:${appointment.id}`, scheduled_for: new Date().toISOString(), status: "queued" });
  if (appointment.assigned_staff_user_id) {
    const { data } = await admin.auth.admin.getUserById(appointment.assigned_staff_user_id);
    const barberEmail = data.user?.email;
    if (barberEmail) jobs.push({ business_id: appointment.business_id, user_id: appointment.assigned_staff_user_id, channel: "email", template_key: "barber_booking_assigned", locale: "en", recipient: barberEmail, payload: { subject: `New appointment: ${appointment.service_name_snapshot}`, body: `${appointment.client_name_snapshot} is scheduled for ${formatted}. Reference ${appointment.public_reference}.`, transactional: true, appointmentId: appointment.id, appointmentField: "barber_notification_status" }, idempotency_key: `barber-booking-assigned:${appointment.id}`, scheduled_for: new Date().toISOString(), status: "queued" });
  }
  if (jobs.length) await admin.from("notification_jobs").upsert(jobs, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
}
