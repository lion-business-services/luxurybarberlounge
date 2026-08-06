import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("booking route is lightweight and business-owned", async () => {
  const page = await source("src/app/book/page.tsx");
  assert.match(page, /BookingFlow/);
  assert.match(page, /businessConfig\.bookingPath/);
  assert.doesNotMatch(page, /video|GSAP|MagneticCursor|PostHeroExperience/);
});

test("booking flow uses real catalog, availability, progress persistence, and attribution", async () => {
  const flow = await source("src/components/booking/BookingFlow.tsx");
  assert.match(flow, /\/api\/booking\/catalog/);
  assert.match(flow, /\/api\/booking\/availability/);
  assert.match(flow, /sessionStorage/);
  assert.match(flow, /popstate/);
  assert.match(flow, /utm_source/);
  assert.match(flow, /First available/);
  assert.match(flow, /Optional inspiration image/);
  assert.match(flow, /Confirm appointment/);
});

test("atomic booking creation prevents overlaps and duplicate retries", async () => {
  const engine = await source("supabase/migrations/202608060011_production_booking_engine.sql");
  const rateLimit = await source("supabase/migrations/202608060014_booking_abuse_protection.sql");
  assert.match(engine, /appointments_no_active_overlap[\s\S]*exclude using gist/);
  assert.match(engine, /slot_holds_no_active_overlap[\s\S]*exclude using gist/);
  assert.match(engine, /create_appointment_atomic/);
  assert.match(engine, /pg_advisory_xact_lock/);
  assert.match(engine, /idempotency_key/);
  assert.match(rateLimit, /consume_rate_limit/);
  assert.match(rateLimit, /pg_advisory_xact_lock/);
});

test("submission persists the booking before FormSubmit and queues independent notifications", async () => {
  const route = await source("src/app/api/booking/submit/route.ts");
  const createIndex = route.indexOf('rpc("create_appointment_atomic"');
  const formSubmitIndex = route.indexOf("sendFormSubmitBooking(record)");
  const notificationsIndex = route.indexOf("queueBookingNotifications(admin, record, token)");
  assert.ok(createIndex >= 0 && formSubmitIndex > createIndex);
  assert.ok(notificationsIndex > createIndex);
  assert.match(route, /existingAppointment/);
  assert.match(route, /SLOT_TAKEN/);
  assert.match(route, /consume_rate_limit/);
});

test("FormSubmit adapter uses supported server-side AJAX options and excludes secrets", async () => {
  const adapter = await source("src/lib/email/formsubmit.ts");
  assert.match(adapter, /formsubmit\.co\/ajax/);
  assert.match(adapter, /_subject/);
  assert.match(adapter, /_template/);
  assert.match(adapter, /_captcha/);
  assert.match(adapter, /_honey/);
  assert.match(adapter, /_url/);
  assert.match(adapter, /awaiting_activation/);
  assert.doesNotMatch(adapter, /SUPABASE_SERVICE_ROLE_KEY|SQUARE_ACCESS_TOKEN|RESEND_API_KEY/);
});

test("FormSubmit failures are retryable and do not delete appointments", async () => {
  const retry = await source("src/app/api/cron/formsubmit/route.ts");
  assert.match(retry, /awaiting_activation/);
  assert.match(retry, /retrying/);
  assert.match(retry, /attempt >= 8/);
  assert.match(retry, /appointments"\)\.update\(\{ formsubmit_status/);
  assert.doesNotMatch(retry, /appointments"\)\.delete/);
});

test("only verified production barbers and eligible services reach public booking", async () => {
  const catalog = await source("src/lib/booking/catalog.ts");
  const hardening = await source("supabase/migrations/202608060013_live_booking_catalog_hardening.sql");
  assert.match(catalog, /identityStatus === "verified"/);
  assert.match(catalog, /\.eq\("demo", false\)/);
  assert.match(catalog, /eligibleServiceIds/);
  assert.match(catalog, /existingSchedules/);
  assert.match(hardening, /where demo = true/);
  assert.match(hardening, /status = 'archived'/);
});

test("availability accounts for schedules, breaks, time off, bookings, holds, and buffers", async () => {
  const availability = await source("src/lib/booking/availability.ts");
  for (const table of ["business_hours", "holiday_hours", "barber_schedules", "barber_breaks", "barber_time_off", "appointments", "slot_holds"]) {
    assert.match(availability, new RegExp(`from\\("${table}"\\)`));
  }
  assert.match(availability, /default_buffer_minutes/);
  assert.match(availability, /minimumLeadMinutes/);
  assert.match(availability, /maximumAdvanceDays/);
});

test("admin appointment workspace provides operational filters and status actions", async () => {
  const workspace = await source("src/components/admin/AdminAppointmentsWorkspace.tsx");
  const route = await source("src/app/api/admin/appointments/route.ts");
  for (const word of ["Date", "Status", "Barber", "Source", "Check in", "Start service", "Complete", "No show", "Reschedule", "Internal note"]) {
    assert.match(workspace, new RegExp(word));
  }
  assert.match(route, /appointment_status_history/);
  assert.match(route, /appointment_assignments/);
  assert.match(route, /booking\.barber_reassigned/);
  assert.match(route, /checkInQueue/);
});

test("client appointment changes are ownership-protected and conflict-safe", async () => {
  const route = await source("src/app/api/client/appointments/route.ts");
  assert.match(route, /createUserServerSupabase/);
  assert.match(route, /from\("appointments"\).*eq\("id", appointmentId\)/s);
  assert.match(route, /reschedule_appointment_atomic/);
  assert.match(route, /cancellationCutoffHours/);
  assert.match(route, /cancelled_by_client/);
});

test("guest management and calendar links require a secure token", async () => {
  const manage = await source("src/lib/booking/manage.ts");
  const calendar = await source("src/app/api/booking/calendar/[reference]/route.ts");
  const submit = await source("src/app/api/booking/submit/route.ts");
  assert.match(manage, /timingSafeEqual/);
  assert.match(manage, /manage_token_hash/);
  assert.match(calendar, /getManagedAppointment/);
  assert.match(submit, /BOOKING_MANAGE_SECRET_REQUIRED/);
});

test("queue display is privacy-safe and appointments synchronize with queue operations", async () => {
  const display = await source("src/app/api/queue/display/route.ts");
  const queue = await source("src/app/api/operations/queue/route.ts");
  assert.doesNotMatch(display, /client_email|client_phone|internal_notes/);
  assert.match(queue, /appointment_id/);
  assert.match(queue, /appointment_status_history/);
  assert.match(queue, /assigned_staff_user_id/);
});

test("notification jobs are idempotent and record client and barber delivery state", async () => {
  const jobs = await source("src/lib/booking/notifications.ts");
  const worker = await source("src/app/api/cron/notifications/route.ts");
  assert.match(jobs, /booking-confirmed:\$\{appointment\.id\}/);
  assert.match(jobs, /booking-reminder-24h:\$\{appointment\.id\}/);
  assert.match(jobs, /barber-booking-assigned/);
  assert.match(worker, /idempotencyKey/);
  assert.match(worker, /client_confirmation_status/);
  assert.match(worker, /barber_notification_status/);
});

test("required booking documentation and safe environment template are packaged", async () => {
  const required = [
    "BOOKING_SYSTEM.md", "BOOKING_FLOW.md", "BOOKING_DATA_MODEL.md", "AVAILABILITY_ENGINE.md",
    "FORMSUBMIT_SETUP.md", "FORMSUBMIT_ACTIVATION.md", "FORMSUBMIT_TROUBLESHOOTING.md",
    "ADMIN_APPOINTMENTS.md", "CLIENT_APPOINTMENTS.md", "BARBER_SCHEDULES.md", "QUEUE_INTEGRATION.md",
    "SQUARE_BOOKING_INTEGRATION.md", "SUPABASE_SETUP.md", "RESEND_EMAILS.md", "BOOKING_AUTOMATIONS.md",
    "BOOKING_SECURITY.md", "BOOKING_QA.md", "QR_BOOKING_SETUP.md", "DEPLOYMENT.md", "LAUNCH_CHECKLIST.md", "TROUBLESHOOTING.md",
  ];
  for (const file of required) assert.ok((await source(`docs/${file}`)).length > 80, file);
  const env = await source(".env.example");
  assert.match(env, /FORMSUBMIT_RECIPIENT_EMAIL=info@theluxurybarberlounge\.com/);
  assert.match(env, /BOOKING_MANAGE_SECRET=/);
  assert.doesNotMatch(env, /sb_secret_|re_[A-Za-z0-9]{20,}|SQUARE_ACCESS_TOKEN=\S+/);
});

test("rescheduling preserves the booked duration without requiring add-on identifiers", async () => {
  const availability = await source("src/lib/booking/availability.ts");
  assert.match(availability, /addonIds\?: string\[\]/);
  assert.match(availability, /durationMinutesOverride\?: number/);
  assert.match(availability, /input\.durationMinutesOverride \?\?/);

  for (const routePath of [
    "src/app/api/admin/appointments/route.ts",
    "src/app/api/booking/manage/[reference]/route.ts",
    "src/app/api/client/appointments/route.ts",
  ]) {
    const route = await source(routePath);
    assert.match(route, /addonIds: \[\]/);
    assert.match(route, /durationMinutesOverride:/);
  }
});
