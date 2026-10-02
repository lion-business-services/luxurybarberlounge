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
  assert.match(flow, /barber\.bookable/);
  assert.match(flow, /availabilityNote/);
});

test("public booking catalog no longer depends on the service-role key during normal page loads", async () => {
  const catalog = await source("src/lib/booking/catalog.ts");
  const route = await source("src/app/api/booking/catalog/route.ts");
  const migration = await source("supabase/migrations/202608060017_ruben_live_booking_release.sql");
  assert.match(catalog, /createPublicServerSupabase/);
  assert.match(catalog, /readPublicBookingCatalog/);
  assert.match(catalog, /rpc\("get_public_booking_catalog"\)/);
  assert.match(route, /getBookingCatalog/);
  assert.doesNotMatch(route, /ensureBookingCatalog/);
  assert.match(migration, /create or replace function public\.get_public_booking_catalog/);
  assert.match(migration, /join public\.barber_schedules bs/);
  assert.match(migration, /bs\.effective_from/);
  assert.match(migration, /grant execute on function public\.get_public_booking_catalog\(\) to anon, authenticated, service_role/);
  assert.doesNotMatch(
  migration,
  /staff_user_id'[\s\S]*jsonb_build_object/,
);
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
  assert.match(catalog, /scheduleCheck/);
  assert.match(hardening, /where demo = true/);
  assert.match(hardening, /status = 'archived'/);
});

test("availability accounts for schedules, breaks, time off, bookings, holds, and buffers", async () => {
  const availability = await source("src/lib/booking/availability.ts");
  for (const table of ["business_hours", "holiday_hours", "barber_schedules", "barber_breaks", "barber_time_off", "appointments", "slot_holds"]) {
    assert.match(availability, new RegExp(`from\\("${table}"\\)`));
  }
  assert.match(availability, /default_buffer_minutes/);
  assert.match(availability, /MINIMUM_LEAD_MINUTES/);
  assert.match(availability, /MAXIMUM_ADVANCE_DAYS/);
  assert.match(availability, /searchSupabaseAvailability/);
  // Every decision is delegated to the one pure engine and the one rule set.
  assert.match(availability, /appointmentOccupancy\(/);
  assert.match(availability, /generateStartTimes\(/);
  assert.match(availability, /evaluatePlacement\(/);
  const engine = await source("src/lib/booking/slots.ts");
  assert.match(engine, /block\.endMs \+ buffer/);
  assert.match(engine, /reason: "buffer"/);
  // Exactly one availability engine: no Square Appointments fallback remains.
  assert.doesNotMatch(availability, /searchSquareBookingAvailability|\/v2\/bookings\/availability/);
});

test("admin appointment workspace provides operational filters and status actions", async () => {
  const workspace = await source("src/components/admin/AdminAppointmentsWorkspace.tsx");
  const route = await source("src/app/api/admin/appointments/route.ts");
  for (const word of ["Date", "Status", "Barber", "Source", "Check in", "Start service", "Finish", "No show", "Move appointment", "Internal note"]) {
    assert.match(workspace, new RegExp(word));
  }
  // The calendar is the shared timeline with drag and drop, and it never moves
  // a card on its own: it reloads after the server confirms the change.
  assert.match(workspace, /<ScheduleBoard/);
  assert.match(workspace, /onDrop=\{handleDrop\}/);
  assert.match(workspace, /booking-availability:northfield/);
  assert.doesNotMatch(workspace, /setPayload\(\(current\)/);
  // Moves, finishing and confirmation are atomic database operations.
  assert.match(route, /moveAppointment\(/);
  assert.match(route, /complete_appointment_atomic/);
  assert.match(route, /confirm_paid_appointment/);
  assert.doesNotMatch(route, /ensureBookingCatalog/);
  assert.match(route, /appointment_status_history/);
  assert.match(route, /appointment_assignments/);
  assert.match(route, /booking\.barber_reassigned/);
  assert.match(route, /checkInQueue/);
});

test("client appointment changes are ownership-protected and conflict-safe", async () => {
  const route = await source("src/app/api/client/appointments/route.ts");
  assert.match(route, /createUserServerSupabase/);
  assert.match(
  route,
  /from\("appointments"\)[\s\S]*eq\("id", appointmentId\)/,
);
  assert.match(route, /moveAppointment\(/);
  assert.match(await source("src/lib/booking/reschedule.ts"), /reschedule_appointment_atomic/);
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

test("a signed-in person can book for contact details that are not on file yet", async () => {
  const submit = await source("src/app/api/booking/submit/route.ts");
  // One login owns one client record. Booking for a new person must create an
  // unlinked client record rather than fail on that rule.
  assert.match(submit, /CLIENT_CREATE_RETRY_WITHOUT_LOGIN_LINK/);
  assert.match(submit, /\.\.\.clientPayload,\s*auth_user_id: null,/);
  const retry = submit.indexOf("CLIENT_CREATE_RETRY_WITHOUT_LOGIN_LINK");
  const failure = submit.indexOf('throw new Error("CLIENT_CREATE_FAILED")');
  assert.ok(retry > 0 && retry < failure, "the unlinked retry must run before the booking is refused");
});

test("booking checkouts cannot be closed below the full service payment without anyone being told", async () => {
  const paymentLink = await source("src/app/api/booking/payment-link/route.ts");
  const balance = await source("src/app/api/booking/balance/[reference]/route.ts");
  const webhook = await source("src/lib/integrations/processSquareWebhook.ts");
  const page = await source("src/app/booking/confirmation/[reference]/page.tsx");
  // Square coupon codes and loyalty rewards are not offered on booking checkouts.
  for (const route of [paymentLink, balance]) {
    assert.match(route, /enable_coupon: false/);
    assert.match(route, /enable_loyalty: false/);
  }
  // A checkout that Square closed for less is reported to staff and never confirmed.
  assert.match(webhook, /CHECKOUT_BELOW_REQUIRED_PAYMENT/);
  assert.match(webhook, /SQUARE_PAYMENT_NOT_VERIFIED/);
  assert.match(webhook, /checkoutLink\.purpose === "deposit" && !belowRequired/);
  // The client is told why instead of waiting for a payment that will not arrive.
  assert.match(page, /closedBelowRequired/);
});

test("the staff calendar lets an appointment be dragged to another day", async () => {
  const board = await source("src/components/schedule/ScheduleBoard.tsx");
  const workspace = await source("src/components/admin/AdminAppointmentsWorkspace.tsx");
  // Choosing a barber shows that barber's days side by side.
  assert.match(workspace, /setView\(barberId \? "week" : "day"\)/);
  assert.match(workspace, /onPage=\{/);
  // The drag survives a change of days, scrolls the page, and pages at the edges.
  assert.match(board, /window\.addEventListener\("pointermove"/);
  assert.match(board, /verticalScroller/);
  assert.match(board, /EDGE_DWELL_MS/);
  assert.match(board, /EDGE_ARM_PX/);
  // The card still moves only after the parent commits the drop.
  assert.doesNotMatch(board, /fetch\(/);
});

test("queue display is privacy-safe and appointments synchronize with queue operations", async () => {
  const display = await source("src/app/api/queue/display/route.ts");
  const queue = await source("src/app/api/operations/queue/route.ts");
  assert.doesNotMatch(display, /client_email|client_phone|internal_notes/);
  assert.match(queue, /appointment_id/);
  assert.match(queue, /appointment_status_history/);
  assert.match(queue, /assigned_staff_user_id/);
});

test("notification jobs are idempotent, immediately deliver confirmations, and retain cron retries", async () => {
  const jobs = await source("src/lib/booking/notifications.ts");
  const processor = await source("src/lib/notifications/process.ts");
  const worker = await source("src/app/api/cron/notifications/route.ts");
  const submit = await source("src/app/api/booking/submit/route.ts");
  assert.match(jobs, /booking-confirmed:\$\{appointment\.id\}/);
  assert.match(jobs, /booking-reminder-24h:\$\{appointment\.id\}/);
  assert.match(jobs, /barber-booking-assigned/);
  assert.match(processor, /idempotencyKey/);
  assert.match(processor, /client_confirmation_status/);
  assert.match(processor, /barber_notification_status/);
  assert.match(worker, /processNotificationJobs/);
  assert.match(submit, /processNotificationJobs\(admin, \{ appointmentId: record\.id/);
});



test("final client-content and Ruben migrations seed the exact live roster, catalog, schedules, and policies", async () => {
  const activation = await source("supabase/migrations/202608060015_booking_launch_activation.sql");
  const migration = await source("supabase/migrations/202608060016_final_client_content_release.sql");
  const rubenMigration = await source("supabase/migrations/202608060017_ruben_live_booking_release.sql");
  assert.match(activation, /authoritative_content_migration/);
  assert.doesNotMatch(activation, /Signature Haircut|Fade Cut|Executive Grooming Package/);
  for (const slug of [
    "angelica-aquino", "hommy-rivera", "barber-los", "jose", "elvis",
    "alfredo-hernandez-pollo", "russ-hawkins", "daniel-penalo",
  ]) assert.match(migration, new RegExp(slug));
  assert.match(rubenMigration, /ruben-diaz-jr/);
  assert.match(rubenMigration, /Owner and Master Barber/);
  assert.match(rubenMigration, /bookableWhenSchedulePublished/);
  assert.match(rubenMigration, /array\[\]::text\[\]/);
  for (const slug of [
    "haircut", "skin-fade", "beard", "cut-and-beard", "hot-towel-shave",
    "kids-haircut", "senior-haircut", "line-up", "design",
  ]) assert.match(migration, new RegExp(`'${slug}'`));
  assert.match(migration, /barber_profile_services/);
  assert.match(migration, /barber_schedules/);
  assert.match(migration, /service_locations/);
  assert.match(migration, /barber_profile_settings/);
  assert.match(migration, /starting_amount_cents/);
  assert.match(migration, /kids_age_limit/);
  assert.match(migration, /senior_age_threshold/);
  assert.match(migration, /deposit_percent/);
});

test("Ruben is a bookable-profile candidate without invented availability or public owner authorization", async () => {
  const content = await source("src/lib/content/site.ts");
  const auth = await source("src/lib/auth/server.ts");
  const migration = await source("supabase/migrations/202608060017_ruben_live_booking_release.sql");
  assert.match(content, /slug: "ruben-diaz-jr"/);
  assert.match(content, /name: "Rubén Diaz, Jr\."/);
  assert.match(content, /title: \{ en: "Owner and Master Barber"/);
  assert.match(content, /bookingWeekdays: \[\]/);
  assert.match(content, /languageCodes: \[\]/);
  assert.match(auth, /isVerifiedOwner/);
  assert.match(auth, /requiredRoles: AppRole\[\] = isVerifiedOwner \? \["owner", "barber"\]/);
  assert.match(auth, /user\.email_confirmed_at/);
  assert.match(auth, /\.eq\("slug", "ruben-diaz-jr"\)/);
  assert.doesNotMatch(content, /INITIAL_OWNER_EMAIL|SUPABASE_SERVICE_ROLE_KEY/);
  const rubenEligibilitySection = migration.slice(
    migration.indexOf("-- Ruben is eligible for the standard menu"),
    migration.indexOf("-- Responsive media metadata for the complete active roster"),
  );
  assert.doesNotMatch(rubenEligibilitySection, /insert into public\.barber_schedules/);
  assert.match(rubenEligibilitySection, /migration intentionally invents no days/);
});

test("catalog bootstrap preserves owner-managed schedules instead of disabling them on read", async () => {
  const catalog = await source("src/lib/booking/catalog.ts");
  assert.match(catalog, /barbersWithSchedules/);
  assert.match(catalog, /if \(!row \|\| barbersWithSchedules\.has/);
  assert.doesNotMatch(
  catalog,
  /barber_schedules"\)\s*\.update\(\{ active: false/,
);
});

test("booking catalog refuses silent partial setup and never caches an empty catalog", async () => {
  const catalog = await source("src/lib/booking/catalog.ts");
  const route = await source("src/app/api/booking/catalog/route.ts");
  assert.match(catalog, /BOOKING_MIGRATIONS_REQUIRED/);
  assert.match(catalog, /NO_BOOKABLE_SERVICES/);
  assert.match(catalog, /NO_ACTIVE_BARBER_SCHEDULES/);
  assert.match(catalog, /requireResult\(eligibilityUpsert\.error/);
  assert.match(route, /force-dynamic/);
  assert.match(route, /private, no-store/);
});
test("required booking documentation and safe environment template are packaged", async () => {
  const required = [
    "BOOKING_SYSTEM.md", "BOOKING_FLOW.md", "BOOKING_DATA_MODEL.md", "AVAILABILITY_ENGINE.md",
    "FORMSUBMIT_SETUP.md", "FORMSUBMIT_ACTIVATION.md", "FORMSUBMIT_TROUBLESHOOTING.md",
    "ADMIN_APPOINTMENTS.md", "CLIENT_APPOINTMENTS.md", "BARBER_SCHEDULES.md", "QUEUE_INTEGRATION.md",
    "SQUARE_BOOKING_INTEGRATION.md", "SUPABASE_SETUP.md", "RESEND_EMAILS.md", "BOOKING_AUTOMATIONS.md",
    "BOOKING_SECURITY.md", "BOOKING_QA.md", "QR_BOOKING_SETUP.md", "DEPLOYMENT.md", "LAUNCH_CHECKLIST.md", "TROUBLESHOOTING.md",
    "FINAL_CLIENT_CONTENT.md", "BARBER_DATA_MAPPING.md", "BARBER_IMAGE_FRAMING.md", "BUSINESS_HOURS.md",
    "SERVICES_AND_PRICING.md", "MEMBERSHIPS_AND_PACKAGES.md", "BARBER_PORTAL.md", "QUEUE_SYSTEM.md",
    "SHOP_QUEUE_DISPLAY.md", "EMAIL_INTEGRATION.md", "RESEND_SETUP.md", "SQUARE_SETUP.md", "SECURITY.md",
    "RLS_TESTING.md", "PORTAL_QA.md", "OWNER_CONFIRMATIONS_REQUIRED.md",
    "RUBEN_PROFILE.md", "BARBER_IMAGE_PIPELINE.md", "BARBER_IMAGE_MAPPING.md",
    "BARBER_APPOINTMENTS.md", "WHO_IS_NEXT.md", "REALTIME_UPDATES.md",
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
  assert.match(availability, /excludeAppointmentId/);

  // One shared move operation: the length comes from the stored appointment
  // (so a family booking moves as a whole) and the appointment being moved
  // never blocks its own destination.
  const move = await source("src/lib/booking/reschedule.ts");
  assert.match(move, /new Date\(appointment\.ends_at\)\.getTime\(\) - new Date\(appointment\.starts_at\)\.getTime\(\)/);
  assert.match(move, /excludeAppointmentId: appointment\.id/);
  assert.match(move, /reschedule_appointment_atomic/);
  assert.match(move, /queueAppointmentChangeNotifications/);

  for (const routePath of [
    "src/app/api/admin/appointments/route.ts",
    "src/app/api/booking/manage/[reference]/route.ts",
    "src/app/api/client/appointments/route.ts",
  ]) {
    const route = await source(routePath);
    assert.match(route, /moveAppointment\(/);
    assert.doesNotMatch(route, /rpc\("reschedule_appointment_atomic"/);
  }

  // The database derives the new end from the stored duration as well.
  const migration = await source("supabase/migrations/202610020001_scheduling_single_source_of_truth.sql");
  assert.match(migration, /v_new_end := p_starts_at \+ \(current_row\.ends_at - current_row\.starts_at\)/);
});

test("Square sandbox auto-syncs foundation mappings without exposing public checkout", async () => {
  const paymentLink = await readFile("src/app/api/booking/payment-link/route.ts", "utf8");
  const sync = await readFile("src/lib/integrations/syncSquareFoundation.ts", "utf8");
  const cron = await readFile("src/app/api/cron/square-sync/route.ts", "utf8");
  const vercel = await readFile("vercel.json", "utf8");

  assert.match(paymentLink, /squareConfig\.environment === "sandbox"/);
  assert.match(paymentLink, /SQUARE_SANDBOX_TEST_EMAILS/);
  assert.match(sync, /portal_email/);
  assert.match(sync, /square_team_member_id/);
  assert.match(sync, /search-catalog-items/);
  assert.match(sync, /square_locations/);
  assert.match(sync, /square_team_members/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(vercel, /\/api\/cron\/square-sync/);
});
