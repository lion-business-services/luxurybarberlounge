import "server-only";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { absoluteUrl, businessConfig } from "@/lib/config/business";

function bookingTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

/** Backfills idempotent 24-hour reminders for confirmed Supabase appointments. */
export async function queueUpcomingAppointmentReminders() {
  const admin = createUntypedAdminSupabase();
  if (!admin) return { configured: false, checked: 0, queued: 0, skipped: 0 };
  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  if (!business?.id) return { configured: false, checked: 0, queued: 0, skipped: 0 };
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60_000);
  const { data: rows, error } = await admin.from("appointments").select("id,auth_user_id,public_reference,client_email_snapshot,service_name_snapshot,barber_name_snapshot,starts_at,timezone,email_consent,status").eq("business_id", business.id).in("status", ["confirmed", "rescheduled"]).gte("starts_at", now.toISOString()).lte("starts_at", windowEnd.toISOString()).order("starts_at").limit(200);
  if (error) throw error;
  let queued = 0; let skipped = 0;
  for (const appointment of rows ?? []) {
    if (!appointment.client_email_snapshot || !appointment.email_consent) { skipped += 1; continue; }
    const when = bookingTime(appointment.starts_at, appointment.timezone || businessConfig.timezone);
    const { error: insertError } = await admin.from("notification_jobs").upsert({
      business_id: business.id,
      user_id: appointment.auth_user_id,
      channel: "email",
      template_key: "booking_reminder_24h",
      locale: "en",
      recipient: appointment.client_email_snapshot,
      payload: { subject: `Reminder: ${appointment.service_name_snapshot} at Luxury Barber Lounge`, body: `Your appointment ${appointment.public_reference} is scheduled for ${when} with ${appointment.barber_name_snapshot}. Please arrive a few minutes early. Call ${businessConfig.phone} if you need help. Manage: ${absoluteUrl("/client/appointments")}`, transactional: true, appointmentId: appointment.id },
      scheduled_for: now.toISOString(),
      status: "queued",
      idempotency_key: `booking-reminder-24h:${appointment.id}`,
    }, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });
    if (insertError) skipped += 1; else queued += 1;
  }
  return { configured: true, checked: (rows ?? []).length, queued, skipped };
}
