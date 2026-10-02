import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  ACTIVE_STATUSES,
  BLOCKING_STATUSES,
  BOOKING_BUFFER_MINUTES,
  BREAK_BLOCKING_STATUS,
  CALENDAR_SNAP_MINUTES,
  CHECKOUT_HOLD_MINUTES,
  EARLY_FINISH_GUARD_MINUTES,
  FINISHABLE_STATUSES,
  HOLD_STATUSES,
  MAX_FAMILY_CHILDREN,
  MINIMUM_LEAD_MINUTES,
  PAID_UNPLACED_STATUS,
  RESCHEDULABLE_STATUSES,
  SCHEDULING_SOURCE_OF_TRUTH,
  SLOT_GRID_MINUTES,
  TIME_OFF_BLOCKING_KIND,
  TIME_OFF_BLOCKING_STATUS,
} from "../../src/lib/booking/rules.ts";

/**
 * The scheduling rules exist twice by design: once in the application
 * (src/lib/booking/rules.ts, used by every screen and API) and once inside
 * Postgres (the guard that has the final word). These tests fail the build if
 * the two definitions ever drift apart.
 */

const MIGRATION = "supabase/migrations/202610020001_scheduling_single_source_of_truth.sql";

function sqlList(values: readonly string[]) {
  return values.map((value) => `'${value}'`).join(", ");
}

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function functionBody(sql: string, name: string) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `Function ${name} must be defined by the scheduling migration`);
  const end = sql.indexOf("\n$$;", start);
  assert.ok(end > start, `Function ${name} must have a body`);
  return sql.slice(start, end);
}

test("application and database scheduling rules agree", async () => {
  const sql = await readFile(MIGRATION, "utf8");

  // Exactly one buffer value, and it is five minutes.
  assert.equal(BOOKING_BUFFER_MINUTES, 5);
  assert.match(functionBody(sql, "booking_buffer_minutes"), new RegExp(`coalesce\\([\\s\\S]*default_buffer_minutes[\\s\\S]*,\\s*${BOOKING_BUFFER_MINUTES}\\s*\\)`));
  assert.match(sql, new RegExp(`alter column default_buffer_minutes set default ${BOOKING_BUFFER_MINUTES};`));
  assert.match(sql, new RegExp(`set default_buffer_minutes = ${BOOKING_BUFFER_MINUTES} where default_buffer_minutes is distinct from ${BOOKING_BUFFER_MINUTES};`));

  // One checkout hold length.
  assert.match(functionBody(sql, "booking_hold_minutes"), new RegExp(`select ${CHECKOUT_HOLD_MINUTES}\\b`));

  // The same statuses block time in both places.
  const blocking = functionBody(sql, "appointment_is_blocking");
  assert.match(blocking, new RegExp(`p_status in \\(${escape(sqlList(ACTIVE_STATUSES))}\\)`));
  assert.match(blocking, new RegExp(`p_status in \\(${escape(sqlList(HOLD_STATUSES))}\\)`));
  assert.match(blocking, /p_deposit_status = 'paid' or p_hold_expires_at is null or p_hold_expires_at > p_now/);
  assert.deepEqual([...BLOCKING_STATUSES], [...HOLD_STATUSES, ...ACTIVE_STATUSES]);

  // The buffered exclusion constraint covers exactly the blocking statuses and
  // measures each appointment up to the end of its buffer.
  assert.match(
    sql,
    new RegExp(`add constraint appointments_no_buffered_overlap\\s+exclude using gist \\(\\s+barber_profile_id with =,\\s+tstzrange\\(starts_at, occupied_until, '\\[\\)'\\) with &&\\s+\\)\\s+where \\(status in \\(${escape(sqlList(BLOCKING_STATUSES))}\\)\\);`),
  );

  // The migration is strictly additive: it removes no database object and no row.
  const statements = sql.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(statements, /\bdrop\s+(table|column|function|trigger|constraint|policy|index|schema|type)\b/i);
  assert.doesNotMatch(statements, /\btruncate\b/i);
  assert.doesNotMatch(statements, /\bdelete\s+from\b/i);

  // Unavailable time and breaks use the same statuses.
  const guard = functionBody(sql, "enforce_appointment_barber_availability");
  assert.match(guard, new RegExp(`status = '${TIME_OFF_BLOCKING_STATUS}'`));
  assert.match(guard, new RegExp(`availability_kind[^\\n]*'${TIME_OFF_BLOCKING_KIND}'`));
  assert.match(guard, new RegExp(`status = '${BREAK_BLOCKING_STATUS}'`));
  for (const code of ["SLOT_CONFLICT", "APPOINTMENT_OUTSIDE_BUSINESS_HOURS", "APPOINTMENT_OUTSIDE_BARBER_SCHEDULE", "BARBER_UNAVAILABLE", "BARBER_ON_BREAK"]) {
    assert.match(guard, new RegExp(code), `The database guard must raise ${code}`);
  }
  assert.match(guard, /pg_advisory_xact_lock\(public\.barber_calendar_lock_key\(/);

  // Moving and finishing accept the same statuses.
  const move = functionBody(sql, "reschedule_appointment_atomic");
  assert.match(move, new RegExp(`current_row\\.status in \\(${escape(sqlList(RESCHEDULABLE_STATUSES))}\\)`));
  // A paid booking that lost its time can be placed by staff, in both layers.
  assert.match(move, new RegExp(`current_row\\.status = '${PAID_UNPLACED_STATUS}' and current_row\\.deposit_status = 'paid'`));
  assert.match(move, /APPOINTMENT_CHANGED/);
  const finish = functionBody(sql, "complete_appointment_atomic");
  assert.match(finish, new RegExp(`status not in \\(${escape(sqlList(FINISHABLE_STATUSES))}\\)`));
  assert.match(finish, new RegExp(`interval '${EARLY_FINISH_GUARD_MINUTES} minutes'`));
  assert.match(finish, /if current_row\.status = 'completed' then return current_row; end if;/);

  // A late payment never double-books: the database reports a conflict and
  // keeps the booking as paid for staff, and the webhook alerts them.
  const confirm = functionBody(sql, "confirm_paid_appointment");
  assert.match(confirm, /'conflict', true/);
  assert.match(confirm, new RegExp(`set status = '${PAID_UNPLACED_STATUS}'`));

  // Holds that carry a verified payment are never released by the guard.
  assert.match(guard, /not exists \(select 1 from public\.appointment_payment_links l where l\.appointment_id = a\.id and l\.status = 'paid'\)/);

  // Family 1 to 5.
  assert.match(functionBody(sql, "create_appointment_atomic"), new RegExp(`v_children < 1 or v_children > ${MAX_FAMILY_CHILDREN}`));
  assert.match(sql, new RegExp(`party_size between 1 and ${MAX_FAMILY_CHILDREN + 1}`));
});

test("the application reads its scheduling values from one place", async () => {
  assert.equal(SCHEDULING_SOURCE_OF_TRUTH, "supabase");
  assert.equal(MINIMUM_LEAD_MINUTES, 0, "No hidden lead time");
  assert.equal(SLOT_GRID_MINUTES % CALENDAR_SNAP_MINUTES, 0);
  assert.equal(BOOKING_BUFFER_MINUTES % CALENDAR_SNAP_MINUTES, 0, "A drag must be able to land exactly on the end of the gap");

  const business = await readFile("src/lib/config/business.ts", "utf8");
  assert.match(business, /defaultBufferMinutes: BOOKING_BUFFER_MINUTES/);
  assert.match(business, /minimumLeadMinutes: MINIMUM_LEAD_MINUTES/);
  assert.doesNotMatch(business, /defaultBufferMinutes:\s*\d/);

  // No second availability system and no feature flag that could switch to one.
  const features = await readFile("src/lib/config/features.ts", "utf8");
  assert.doesNotMatch(features, /squareLiveBooking/);
  for (const path of ["src/app/api/booking/availability/route.ts", "src/app/api/booking/submit/route.ts", "src/lib/booking/availability.ts"]) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(text, /searchSquareBookingAvailability|bookings\/availability\/search/, `${path} must not consult Square for availability`);
  }

  // Availability is never cached.
  const route = await readFile("src/app/api/booking/availability/route.ts", "utf8");
  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /no-store/);
});

test("every staff surface draws its calendar from the shared engine", async () => {
  const model = await readFile("src/lib/booking/calendar-model.ts", "utf8");
  assert.match(model, /appointmentOccupancy\(/);
  assert.match(model, /evaluatePlacement\(/);

  const board = await readFile("src/components/schedule/ScheduleBoard.tsx", "utf8");
  assert.match(board, /previewMove\(/);
  assert.match(board, /barberDayModel\(/);

  for (const path of ["src/components/admin/AdminAppointmentsWorkspace.tsx", "src/components/barber/BarberDayCalendar.tsx"]) {
    const text = await readFile(path, "utf8");
    assert.match(text, /<ScheduleBoard/, `${path} must render the shared timeline`);
    assert.match(text, /booking-availability:northfield/, `${path} must follow live availability changes`);
  }

  // The barber may only finish an appointment on their own calendar.
  const barberRoute = await readFile("src/app/api/barber/calendar/route.ts", "utf8");
  assert.match(barberRoute, /\.eq\("barber_profile_id", ctx\.profile\.id\)/);
  assert.match(barberRoute, /complete_appointment_atomic/);

  // Unavailability checks use the same definition of "occupied".
  for (const path of ["src/app/api/barber/availability/route.ts", "src/app/api/admin/time-off/route.ts"]) {
    assert.match(await readFile(path, "utf8"), /appointmentOccupancy\(/, `${path} must use the shared blocking rule`);
  }
});

test("unpaid checkout holds are released on a schedule and never notify twice", async () => {
  const vercel = JSON.parse(await readFile("vercel.json", "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  assert.equal(vercel.crons.find((cron) => cron.path === "/api/cron/appointments")?.schedule, "*/5 * * * *");

  const cron = await readFile("src/app/api/cron/appointments/route.ts", "utf8");
  assert.match(cron, /expireUnpaidHolds\(/);

  const notifications = await readFile("src/lib/booking/change-notifications.ts", "utf8");
  assert.match(notifications, /moved:\$\{appointment\.reschedule_count\}/);
  assert.match(notifications, /ignoreDuplicates: true/);

  const webhook = await readFile("src/lib/integrations/processSquareWebhook.ts", "utf8");
  assert.match(webhook, /confirm_paid_appointment/);
  assert.match(webhook, /PAID_AFTER_HOLD_EXPIRED/);
  assert.match(webhook, /confirmationResult\?\.conflict === true/);

  // The confirmation page never tells a paying client they were not charged.
  const confirmation = await readFile("src/app/booking/confirmation/[reference]/page.tsx", "utf8");
  assert.match(confirmation, /paidButReleased/);
});
