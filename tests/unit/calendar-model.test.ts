import assert from "node:assert/strict";
import { test } from "node:test";

import {
  barberDayModel,
  clipToDay,
  instantForLocalMinute,
  localMinuteOfDay,
  moveTargets,
  previewMove,
  snapMinute,
  visibleRange,
  type CalendarFacts,
} from "../../src/lib/booking/calendar-model.ts";
import { toZonedInputValue, zonedDateTimeToUtc, zonedInputToUtc } from "../../src/lib/booking/timezone.ts";

const TZ = "America/New_York";
const RUBEN = "barber-ruben";
const HOMMY = "barber-hommy";
// Tuesday 6 October 2026 (weekday 2).
const DAY = "2026-10-06";

function at(clock: string, date = DAY) {
  return zonedDateTimeToUtc(date, `${clock}:00`, TZ);
}

function facts(overrides: Partial<CalendarFacts> = {}): CalendarFacts {
  return {
    timezone: TZ,
    bufferMinutes: 5,
    nowMs: at("07:00").getTime(),
    schedules: [
      { barber_profile_id: RUBEN, weekday: 2, starts_at: "08:00:00", ends_at: "21:00:00", effective_from: null, effective_to: null, active: true },
      { barber_profile_id: HOMMY, weekday: 2, starts_at: "10:00:00", ends_at: "18:00:00", effective_from: null, effective_to: null, active: true },
    ],
    businessHours: [{ weekday: 2, opens_at: "08:00:00", closes_at: "21:00:00", closed: false }],
    holidayHours: [],
    timeOff: [],
    breaks: [],
    appointments: [],
    ...overrides,
  };
}

function appointment(id: string, barber: string, start: string, end: string, extra: Record<string, unknown> = {}) {
  return { id, barber_profile_id: barber, starts_at: at(start).toISOString(), ends_at: at(end).toISOString(), status: "confirmed", deposit_status: "paid", ...extra };
}

test("calendar preview applies the same 5-minute rule as the booking engine", () => {
  const data = facts({ appointments: [appointment("a", RUBEN, "12:00", "12:45"), appointment("b", RUBEN, "10:00", "11:00")] });
  const move = (clock: string) => previewMove(data, { appointmentId: "b", durationMinutes: 60, barberId: RUBEN, date: DAY, startMs: at(clock).getTime() });

  assert.deepEqual(move("12:50"), { ok: true });
  assert.equal(move("12:49").ok, false);
  assert.equal((move("12:49") as { reason: string }).reason, "buffer");
  assert.equal((move("12:30") as { reason: string }).reason, "appointment");
  // Ending at 11:55 leaves exactly five minutes before the 12:00 appointment.
  assert.deepEqual(move("10:55"), { ok: true });
  assert.equal((move("10:56") as { reason: string }).reason, "buffer");
});

test("an appointment being moved never blocks its own destination", () => {
  const data = facts({ appointments: [appointment("b", RUBEN, "10:00", "11:00")] });
  // Sliding the same appointment by 15 minutes overlaps only itself.
  assert.deepEqual(previewMove(data, { appointmentId: "b", durationMinutes: 60, barberId: RUBEN, date: DAY, startMs: at("10:15").getTime() }), { ok: true });
});

test("calendar preview rejects moves outside the schedule, into time off, breaks, holds and the past", () => {
  const data = facts({
    nowMs: at("09:00").getTime(),
    timeOff: [{ id: "off", barber_profile_id: RUBEN, starts_at: at("14:00").toISOString(), ends_at: at("16:00").toISOString(), status: "approved", availability_kind: "unavailable" }],
    breaks: [{ id: "lunch", barber_profile_id: RUBEN, starts_at: at("12:00").toISOString(), ends_at: at("12:30").toISOString(), status: "scheduled" }],
    appointments: [
      appointment("b", RUBEN, "10:00", "11:00"),
      appointment("hold", RUBEN, "17:00", "18:00", { status: "pending_confirmation", deposit_status: "pending", hold_expires_at: at("09:10").toISOString() }),
      appointment("stale", RUBEN, "19:00", "20:00", { status: "pending_confirmation", deposit_status: "pending", hold_expires_at: at("08:00").toISOString() }),
    ],
  });
  const reason = (barber: string, clock: string) => {
    const result = previewMove(data, { appointmentId: "b", durationMinutes: 60, barberId: barber, date: DAY, startMs: at(clock).getTime() });
    return result.ok ? "ok" : result.reason;
  };

  assert.equal(reason(RUBEN, "08:30"), "past");
  assert.equal(reason(RUBEN, "20:30"), "outside_schedule");
  assert.equal(reason(HOMMY, "09:30"), "outside_schedule");
  assert.equal(reason(RUBEN, "13:30"), "time_off");
  assert.equal(reason(RUBEN, "11:30"), "break");
  assert.equal(reason(RUBEN, "17:30"), "hold");
  // An expired, unpaid hold no longer blocks anything.
  assert.equal(reason(RUBEN, "19:00"), "ok");
  // Another barber's open time is a valid target.
  assert.equal(reason(HOMMY, "10:00"), "ok");
});

test("time off of another kind or status does not block the calendar", () => {
  const data = facts({
    timeOff: [
      { id: "requested", barber_profile_id: RUBEN, starts_at: at("09:00").toISOString(), ends_at: at("10:00").toISOString(), status: "requested", availability_kind: "unavailable" },
      { id: "cancelled", barber_profile_id: RUBEN, starts_at: at("10:00").toISOString(), ends_at: at("11:00").toISOString(), status: "cancelled", availability_kind: "unavailable" },
    ],
  });
  assert.equal(barberDayModel(data, RUBEN, DAY).hardBlocks.length, 0);
});

test("move targets include the first start after an early finish plus the gap", () => {
  const data = facts({
    nowMs: at("12:31").getTime(),
    appointments: [
      appointment("done", RUBEN, "12:00", "13:00", { status: "completed", completed_at: at("12:30").toISOString() }),
      appointment("b", RUBEN, "15:00", "15:40"),
    ],
  });
  const starts = moveTargets(data, { appointmentId: "b", durationMinutes: 40, barberId: RUBEN, date: DAY }).map((value) => localMinuteOfDay(value, TZ));
  assert.equal(starts[0], 12 * 60 + 35);
  assert.ok(starts.includes(12 * 60 + 45));
});

test("wall-clock positions stay correct across the daylight saving changes", () => {
  // Clocks go back on 1 November 2026 and forward on 14 March 2027.
  for (const date of ["2026-11-01", "2027-03-14", DAY]) {
    for (const minute of [9 * 60, 12 * 60 + 50, 20 * 60 + 55]) {
      assert.equal(localMinuteOfDay(instantForLocalMinute(date, minute, TZ), TZ), minute, `${date} ${minute}`);
    }
  }
  const fallBack = clipToDay({ startMs: at("09:00", "2026-11-01").getTime(), endMs: at("10:00", "2026-11-01").getTime() }, "2026-11-01", TZ, 0, 24 * 60);
  assert.deepEqual(fallBack, { startMinute: 9 * 60, endMinute: 10 * 60 });
});

test("an interval is clipped to the visible day and hidden on other days", () => {
  const fullDayOff = { startMs: at("00:00").getTime(), endMs: at("00:00", "2026-10-07").getTime() };
  assert.deepEqual(clipToDay(fullDayOff, DAY, TZ, 8 * 60, 21 * 60), { startMinute: 8 * 60, endMinute: 21 * 60 });
  assert.equal(clipToDay(fullDayOff, "2026-10-08", TZ, 8 * 60, 21 * 60), null);
});

test("the visible range follows opening hours and grows to show every appointment", () => {
  assert.deepEqual(visibleRange(facts(), [DAY]), { startMinute: 8 * 60, endMinute: 21 * 60 });
  const late = facts({ appointments: [appointment("late", RUBEN, "21:10", "21:50")] });
  assert.deepEqual(visibleRange(late, [DAY]), { startMinute: 8 * 60, endMinute: 22 * 60 });
  // A closed day with nothing on it falls back to a sensible range.
  assert.deepEqual(visibleRange(facts(), ["2026-10-05"]), { startMinute: 8 * 60, endMinute: 21 * 60 });
});

test("dragging snaps to five minutes so a 12:50 start is reachable", () => {
  assert.equal(snapMinute(12 * 60 + 48.2, 5), 12 * 60 + 50);
  assert.equal(snapMinute(12 * 60 + 52.4, 5), 12 * 60 + 50);
});

test("reschedule pickers read and show lounge time regardless of the device timezone", () => {
  const instant = at("12:50");
  assert.equal(toZonedInputValue(instant, TZ), "2026-10-06T12:50");
  assert.equal(zonedInputToUtc("2026-10-06T12:50", TZ)?.toISOString(), instant.toISOString());
  assert.equal(zonedInputToUtc("not a date", TZ), null);
  // 12:50 Eastern is 16:50 UTC in October (daylight time) and 17:50 UTC in December.
  assert.equal(zonedInputToUtc("2026-10-06T12:50", TZ)?.toISOString(), "2026-10-06T16:50:00.000Z");
  assert.equal(zonedInputToUtc("2026-12-08T12:50", TZ)?.toISOString(), "2026-12-08T17:50:00.000Z");
});
