import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_STATUSES,
  BLOCKING_STATUSES,
  BOOKING_BUFFER_MINUTES,
  CHECKOUT_HOLD_MINUTES,
  HOLD_STATUSES,
  MINIMUM_LEAD_MINUTES,
  NON_BLOCKING_STATUSES,
  appointmentOccupancy,
  isReschedulable,
  parseFamilyTier,
  resolveBufferMinutes,
} from "../../src/lib/booking/rules.ts";
import {
  evaluatePlacement,
  freeIntervals,
  generateStartTimes,
  scheduleWindowsForDate,
  shopDayFor,
  toUtcWindows,
  type BookingBlock,
  type HardBlock,
  type ScheduleRow,
} from "../../src/lib/booking/slots.ts";
import { composeFamilyBooking } from "../../src/lib/booking/family.ts";
import { dateInZone, weekdayForDate, zonedDateTimeToUtc } from "../../src/lib/booking/timezone.ts";

const TZ = "America/New_York";
const BARBER = "barber-ruben";
const DAY = "2026-10-06"; // a Tuesday

const businessHours = [
  { weekday: 0, opens_at: "09:00:00", closes_at: "16:00:00", closed: false },
  { weekday: 1, opens_at: null, closes_at: null, closed: true },
  ...[2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens_at: "08:00:00", closes_at: "21:00:00", closed: false })),
];

const schedules: ScheduleRow[] = [2, 3, 4, 5].map((weekday) => ({
  barber_profile_id: BARBER,
  weekday,
  starts_at: "08:00:00",
  ends_at: "21:00:00",
  effective_from: "2026-08-27",
  effective_to: null,
  active: true,
}));

function at(time: string, date = DAY) {
  return zonedDateTimeToUtc(date, time.length === 5 ? `${time}:00` : time, TZ).getTime();
}

function local(ms: number) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
}

function windowsFor(date = DAY, rows = schedules) {
  const weekday = weekdayForDate(date);
  return toUtcWindows(date, scheduleWindowsForDate(rows, BARBER, weekday, date, shopDayFor(date, weekday, businessHours, [])), TZ);
}

function booking(start: string, end: string, kind: BookingBlock["kind"] = "appointment", id = `${start}-${end}`): BookingBlock {
  return { kind, id, startMs: at(start), endMs: at(end) };
}

function starts(durationMinutes: number, bookings: BookingBlock[] = [], hardBlocks: HardBlock[] = [], date = DAY) {
  return generateStartTimes({ windows: windowsFor(date), durationMinutes, bookings, hardBlocks }).map(local);
}

function check(start: string, durationMinutes: number, bookings: BookingBlock[] = [], hardBlocks: HardBlock[] = []) {
  return evaluatePlacement({ startMs: at(start), durationMinutes, windows: windowsFor(), bookings, hardBlocks });
}

test("the rule constants are the agreed business rules", () => {
  assert.equal(BOOKING_BUFFER_MINUTES, 5);
  assert.equal(MINIMUM_LEAD_MINUTES, 0, "no hidden lead time");
  assert.equal(CHECKOUT_HOLD_MINUTES, 15);
  assert.deepEqual([...HOLD_STATUSES], ["slot_held", "pending_confirmation"]);
  assert.deepEqual([...ACTIVE_STATUSES], ["confirmed", "checked_in", "assigned", "in_service"]);
  assert.deepEqual([...BLOCKING_STATUSES], [...HOLD_STATUSES, ...ACTIVE_STATUSES]);
  assert.equal(resolveBufferMinutes(5), 5);
  assert.equal(resolveBufferMinutes(null), 5);
  assert.equal(resolveBufferMinutes(-3), 5);
  assert.equal(resolveBufferMinutes("abc"), 5);
});

test("1. a scheduled barber with no appointments is available across the whole saved schedule", () => {
  const list = starts(60);
  assert.equal(list[0], "08:00");
  assert.equal(list.at(-1), "20:00", "a 60-minute service may end exactly at closing; no buffer is needed before close");
  assert.equal(list.length, 49);
  assert.ok(list.includes("12:15"));
});

test("a day the barber does not work, or the lounge is closed, offers nothing", () => {
  assert.deepEqual(starts(60, [], [], "2026-10-10"), [], "Ruben has no Saturday schedule");
  assert.deepEqual(starts(60, [], [], "2026-10-05"), [], "the lounge is closed on Monday");
});

test("the barber schedule is clamped to opening hours and merged with date overrides", () => {
  const sunday = "2026-10-11";
  const rows: ScheduleRow[] = [
    { barber_profile_id: BARBER, weekday: 0, starts_at: "07:00:00", ends_at: "12:00:00", effective_from: "2026-08-01", effective_to: null, active: true },
    { barber_profile_id: BARBER, weekday: 0, starts_at: "12:00:00", ends_at: "18:00:00", effective_from: sunday, effective_to: sunday, active: true },
    { barber_profile_id: BARBER, weekday: 0, starts_at: "10:00:00", ends_at: "11:00:00", effective_from: "2026-08-01", effective_to: null, active: false },
  ];
  const shop = shopDayFor(sunday, 0, businessHours, []);
  assert.deepEqual(scheduleWindowsForDate(rows, BARBER, 0, sunday, shop), [{ open: "09:00:00", close: "16:00:00" }]);
  assert.deepEqual(scheduleWindowsForDate(rows, "someone-else", 0, sunday, shop), []);
  assert.equal(shopDayFor("2026-10-05", 1, businessHours, []), null);
  assert.deepEqual(shopDayFor("2026-10-06", 2, businessHours, [{ service_date: "2026-10-06", opens_at: "10:00:00", closes_at: "14:00:00", closed: false }]), { open: "10:00:00", close: "14:00:00" });
});

test("2. an existing appointment blocks every start that would touch it", () => {
  const list = starts(60, [booking("12:00", "13:00")]);
  for (const blocked of ["11:15", "11:30", "11:45", "12:00", "12:30", "12:45", "13:00"]) assert.equal(list.includes(blocked), false, blocked);
  assert.ok(list.includes("10:45"), "10:45-11:45 leaves more than the buffer before 12:00");
  assert.ok(list.includes("13:05"), "the first start after the buffer is offered");
  assert.deepEqual(check("11:30", 60, [booking("12:00", "13:00")]), { ok: false, reason: "appointment", conflictId: "12:00-13:00" });
});

test("3-4. approved unavailable time blocks, and removing it reopens the time", () => {
  const off: HardBlock = { kind: "time_off", id: "off-1", startMs: at("13:00"), endMs: at("15:00") };
  const blocked = starts(60, [], [off]);
  assert.equal(blocked.includes("13:00"), false);
  assert.equal(blocked.includes("12:30"), false);
  assert.ok(blocked.includes("12:00"), "an appointment may end exactly when time off begins");
  assert.ok(blocked.includes("15:00"), "an appointment may start exactly when time off ends");
  assert.deepEqual(check("14:00", 60, [], [off]), { ok: false, reason: "time_off", conflictId: "off-1" });

  const reopened = starts(60, [], []);
  assert.ok(reopened.includes("13:00") && reopened.includes("14:00"));
});

test("a scheduled break blocks exactly its own window", () => {
  const lunch: HardBlock = { kind: "break", id: "break-1", startMs: at("12:00"), endMs: at("12:30") };
  assert.equal(check("11:45", 30, [], [lunch]).ok, false);
  assert.equal(check("11:30", 30, [], [lunch]).ok, true);
  assert.equal(check("12:30", 30, [], [lunch]).ok, true);
});

test("5. the buffer is exactly five minutes: an appointment ending 12:45 blocks until 12:50", () => {
  const existing = [booking("12:00", "12:45")];
  assert.deepEqual(check("12:45", 30, existing), { ok: false, reason: "buffer", conflictId: "12:00-12:45" });
  assert.deepEqual(check("12:49", 30, existing), { ok: false, reason: "buffer", conflictId: "12:00-12:45" });
  assert.deepEqual(check("12:50", 30, existing), { ok: true });
  assert.ok(starts(30, existing).includes("12:50"), "12:50 is offered even though it is off the 15-minute grid");
});

test("the buffer is applied once between neighbours, never doubled", () => {
  const next = [booking("13:00", "14:00")];
  assert.deepEqual(check("12:25", 30, next), { ok: true }, "12:25-12:55 leaves exactly five minutes before 13:00");
  assert.deepEqual(check("12:26", 30, next), { ok: false, reason: "buffer", conflictId: "13:00-14:00" });

  const both = [booking("12:00", "12:45"), booking("13:25", "14:00")];
  assert.deepEqual(check("12:50", 30, both), { ok: true }, "a 30-minute service fits a 40-minute gap: 5 + 30 + 5");
  assert.equal(check("12:50", 31, both).ok, false);
});

test("6. finishing early reopens the unused time after the five-minute buffer", () => {
  const now = at("12:31");
  const scheduled = { status: "in_service", starts_at: new Date(at("12:00")).toISOString(), ends_at: new Date(at("13:00")).toISOString() };
  const before = appointmentOccupancy(scheduled, now);
  assert.equal(local(before?.endMs ?? 0), "13:00");

  const finished = appointmentOccupancy({ ...scheduled, status: "completed", completed_at: new Date(at("12:30")).toISOString() }, now);
  assert.equal(finished?.kind, "completed");
  assert.equal(local(finished?.endMs ?? 0), "12:30");

  const blocks: BookingBlock[] = finished ? [{ ...finished, id: "finished" }] : [];
  assert.equal(check("12:34", 25, blocks).ok, false);
  assert.deepEqual(check("12:35", 25, blocks), { ok: true });
  assert.ok(starts(25, blocks).includes("12:35"));
});

test("finishing late never extends the reservation, and the original schedule is preserved", () => {
  const row = { status: "completed", starts_at: new Date(at("12:00")).toISOString(), ends_at: new Date(at("13:00")).toISOString(), completed_at: new Date(at("16:40")).toISOString() };
  assert.equal(local(appointmentOccupancy(row, at("17:00"))?.endMs ?? 0), "13:00");
  assert.equal(local(appointmentOccupancy({ ...row, completed_at: null }, at("17:00"))?.endMs ?? 0), "13:00");
  assert.equal(row.ends_at, new Date(at("13:00")).toISOString());
});

test("7-9. rescheduling frees the old time, blocks the new time, and rejects an invalid destination", () => {
  const other = booking("15:00", "16:00", "appointment", "other");
  const original = booking("12:00", "13:00", "appointment", "moving");
  const beforeMove = [original, other];
  assert.equal(starts(60, beforeMove).includes("12:00"), false);

  // The appointment being moved is excluded from its own conflict check.
  const withoutSelf = beforeMove.filter((item) => item.id !== "moving");
  assert.deepEqual(evaluatePlacement({ startMs: at("12:15"), durationMinutes: 60, windows: windowsFor(), bookings: withoutSelf, hardBlocks: [] }), { ok: true });
  assert.deepEqual(evaluatePlacement({ startMs: at("14:30"), durationMinutes: 60, windows: windowsFor(), bookings: withoutSelf, hardBlocks: [] }), { ok: false, reason: "appointment", conflictId: "other" });
  assert.equal(evaluatePlacement({ startMs: at("20:30"), durationMinutes: 60, windows: windowsFor(), bookings: withoutSelf, hardBlocks: [] }).ok, false, "cannot run past the end of the schedule");

  const afterMove = [booking("09:00", "10:00", "appointment", "moving"), other];
  const list = starts(60, afterMove);
  assert.ok(list.includes("12:00"), "the old slot is available again");
  assert.equal(list.includes("09:00"), false, "the new slot is blocked");
  assert.equal(list.includes("09:30"), false);
});

test("11. only blocking statuses occupy time; an expired checkout hold releases immediately", () => {
  const now = Date.parse("2026-10-06T14:00:00Z");
  const base = { starts_at: "2026-10-06T16:00:00Z", ends_at: "2026-10-06T17:00:00Z" };
  for (const status of ACTIVE_STATUSES) assert.equal(appointmentOccupancy({ ...base, status }, now)?.kind, "appointment", status);
  for (const status of NON_BLOCKING_STATUSES) assert.equal(appointmentOccupancy({ ...base, status }, now), null, status);

  const live = { ...base, status: "pending_confirmation", deposit_status: "pending", hold_expires_at: "2026-10-06T14:05:00Z" };
  assert.equal(appointmentOccupancy(live, now)?.kind, "hold");
  assert.equal(appointmentOccupancy({ ...live, hold_expires_at: "2026-10-06T13:59:59Z" }, now), null, "an abandoned checkout stops blocking the moment it expires");
  assert.equal(appointmentOccupancy({ ...live, hold_expires_at: "2026-10-06T13:00:00Z", deposit_status: "paid" }, now)?.kind, "hold", "a paid hold never releases");
  assert.equal(appointmentOccupancy({ ...live, hold_expires_at: null }, now)?.kind, "hold", "a hold with no recorded expiry fails closed");
  assert.equal(appointmentOccupancy({ ...base, status: "confirmed", ends_at: base.starts_at }, now), null, "an invalid range never blocks");
});

test("an active checkout hold blocks like an appointment, including the buffer", () => {
  const hold = [booking("10:00", "11:00", "hold", "hold-1")];
  assert.deepEqual(check("10:30", 30, hold), { ok: false, reason: "hold", conflictId: "hold-1" });
  assert.deepEqual(check("11:00", 30, hold), { ok: false, reason: "buffer", conflictId: "hold-1" });
  assert.deepEqual(check("11:05", 30, hold), { ok: true });
});

test("past and too-far starts are rejected only when the caller supplies the bounds", () => {
  const windows = windowsFor();
  assert.deepEqual(evaluatePlacement({ startMs: at("09:00"), durationMinutes: 30, windows, bookings: [], hardBlocks: [], earliestMs: at("09:01") }), { ok: false, reason: "past" });
  assert.deepEqual(evaluatePlacement({ startMs: at("09:00"), durationMinutes: 30, windows, bookings: [], hardBlocks: [], earliestMs: at("09:00") }), { ok: true });
  assert.deepEqual(evaluatePlacement({ startMs: at("09:00"), durationMinutes: 30, windows, bookings: [], hardBlocks: [], latestMs: at("08:00") }), { ok: false, reason: "too_far_ahead" });
  const remaining = generateStartTimes({ windows, durationMinutes: 60, bookings: [], hardBlocks: [], earliestMs: at("19:10") }).map(local);
  assert.deepEqual(remaining, ["19:15", "19:30", "19:45", "20:00"]);
});

const haircut = { id: "svc-haircut", slug: "haircut", name: "Haircut", durationMinutes: 60, priceCents: 5000 };
const seniorCut = { id: "svc-senior", slug: "senior-haircut", name: "Senior Haircut", durationMinutes: 35, priceCents: 4000 };
const kids = { id: "svc-kids", slug: "kids-haircut", name: "Kids Haircut", durationMinutes: 40, priceCents: 3500 };

test("12-16, 19-20. Family 1 through Family 5 compute children, duration and price from the catalog", () => {
  const expected = [
    { children: 1, duration: 60 + 40 + 5, price: 5000 + 3500 },
    { children: 2, duration: 60 + 80 + 10, price: 5000 + 7000 },
    { children: 3, duration: 60 + 120 + 15, price: 5000 + 10500 },
    { children: 4, duration: 60 + 160 + 20, price: 5000 + 14000 },
    { children: 5, duration: 60 + 200 + 25, price: 5000 + 17500 },
  ];
  for (const row of expected) {
    const family = composeFamilyBooking({ adult: haircut, child: kids, childCount: row.children });
    assert.equal(family.tierSlug, `family-${row.children}`);
    assert.equal(family.partySize, row.children + 1);
    assert.equal(family.items.length, row.children + 1);
    assert.equal(family.items[0].role, "adult");
    assert.equal(family.items[0].serviceId, haircut.id);
    assert.equal(family.items.filter((item) => item.role === "child").length, row.children);
    assert.ok(family.items.slice(1).every((item) => item.serviceId === kids.id));
    assert.equal(family.totalDurationMinutes, row.duration);
    assert.equal(family.totalPriceCents, row.price);
    assert.equal(family.items.reduce((sum, item) => sum + item.priceCents, 0), row.price, "itemized prices add up to the charged total");
    const last = family.items.at(-1);
    assert.equal((last?.offsetMinutes ?? 0) + (last?.durationMinutes ?? 0), row.duration);
  }
});

test("family members are consecutive with one five-minute changeover, and the adult service is selectable", () => {
  const family = composeFamilyBooking({ adult: seniorCut, child: kids, childCount: 2 });
  assert.deepEqual(family.items.map((item) => [item.label, item.offsetMinutes, item.durationMinutes]), [["Adult", 0, 35], ["Child 1", 40, 40], ["Child 2", 85, 40]]);
  assert.equal(family.totalDurationMinutes, 125);
  assert.equal(family.totalPriceCents, 4000 + 2 * 3500);
  assert.equal(family.summary, "Family 2: Senior Haircut + 2 × Kids Haircut");
  assert.equal(composeFamilyBooking({ adult: { ...seniorCut, priceCents: 4500 }, child: { ...kids, priceCents: 3000 }, childCount: 2 }).totalPriceCents, 10500, "a catalog price change flows straight through");
});

test("family composition rejects impossible requests", () => {
  for (const childCount of [0, 6, 1.5, -1]) assert.throws(() => composeFamilyBooking({ adult: haircut, child: kids, childCount }), /FAMILY_CHILD_COUNT_OUT_OF_RANGE/);
  assert.throws(() => composeFamilyBooking({ adult: kids, child: kids, childCount: 1 }), /MUST_DIFFER/);
  assert.equal(parseFamilyTier("family-3"), 3);
  assert.equal(parseFamilyTier("family-6"), null);
  assert.equal(parseFamilyTier("family-0"), null);
  assert.equal(parseFamilyTier(undefined), null);
});

test("17-18. a family start is offered only when the whole sequence fits without crossing an appointment or time off", () => {
  const family = composeFamilyBooking({ adult: haircut, child: kids, childCount: 2 }); // 150 minutes
  const existing = [booking("12:00", "13:00")];
  const list = starts(family.totalDurationMinutes, existing);
  assert.ok(list.includes("09:15"), "09:15 + 150 = 11:45 fits before 12:00");
  assert.equal(list.includes("09:30"), false, "09:30 would run into the buffer of the 12:00 appointment");
  assert.deepEqual(check("09:25", family.totalDurationMinutes, existing), { ok: true }, "09:25 + 150 = 11:55, exactly the buffer before 12:00");
  assert.equal(check("09:26", family.totalDurationMinutes, existing).ok, false);
  assert.equal(list.includes("11:00"), false, "the family may not straddle another appointment");
  assert.ok(list.includes("13:05"));
  assert.equal(list.at(-1), "18:30", "the last child must finish by closing time");

  const off: HardBlock = { kind: "time_off", id: "off", startMs: at("10:00"), endMs: at("11:00") };
  const withTimeOff = starts(family.totalDurationMinutes, [], [off]);
  assert.equal(withTimeOff.some((time) => time < "11:00"), false, "no 150-minute window exists before 11:00 once 10:00-11:00 is unavailable");
  assert.equal(withTimeOff[0], "11:00");

  const big = composeFamilyBooking({ adult: haircut, child: kids, childCount: 5 }); // 285 minutes
  const busy = [booking("10:00", "11:00"), booking("14:00", "15:00"), booking("18:00", "19:00")];
  assert.deepEqual(starts(big.totalDurationMinutes, busy), [], "no start is shown when no gap can hold the whole family");
});

test("21. a family booking is a single block, so it can only ever move as a whole", () => {
  const family = composeFamilyBooking({ adult: haircut, child: kids, childCount: 3 }); // 195 minutes
  const others = [booking("16:00", "17:00", "appointment", "other")];
  const ok = evaluatePlacement({ startMs: at("12:40"), durationMinutes: family.totalDurationMinutes, windows: windowsFor(), bookings: others, hardBlocks: [] });
  assert.deepEqual(ok, { ok: true }, "12:40 + 195 = 15:55");
  const blocked = evaluatePlacement({ startMs: at("13:00"), durationMinutes: family.totalDurationMinutes, windows: windowsFor(), bookings: others, hardBlocks: [] });
  assert.equal(blocked.ok, false);
  assert.ok(family.items.every((item, index) => index === 0 || item.offsetMinutes > family.items[index - 1].offsetMinutes), "member offsets are relative, so they travel with the block");
});

test("22. timezone conversion is correct on normal days and across both DST transitions", () => {
  assert.equal(zonedDateTimeToUtc("2026-10-06", "08:00:00", TZ).toISOString(), "2026-10-06T12:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2026-10-31", "09:00:00", TZ).toISOString(), "2026-10-31T13:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2026-11-01", "09:00:00", TZ).toISOString(), "2026-11-01T14:00:00.000Z", "fall back: Sunday opens at 09:00 EST");
  assert.equal(zonedDateTimeToUtc("2027-03-13", "09:00:00", TZ).toISOString(), "2027-03-13T14:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2027-03-14", "09:00:00", TZ).toISOString(), "2027-03-14T13:00:00.000Z", "spring forward: Sunday opens at 09:00 EDT");

  assert.equal(dateInZone(new Date("2026-10-07T03:30:00Z"), TZ), "2026-10-06", "a late-evening appointment stays on its local calendar day");
  assert.equal(dateInZone(new Date("2026-10-07T04:00:00Z"), TZ), "2026-10-07");
  assert.equal(weekdayForDate("2026-10-06"), 2);

  const sundayRows: ScheduleRow[] = [{ barber_profile_id: BARBER, weekday: 0, starts_at: "09:00:00", ends_at: "16:00:00", effective_from: "2026-08-01", effective_to: null, active: true }];
  for (const date of ["2026-11-01", "2027-03-14"]) {
    const [window] = windowsFor(date, sundayRows);
    assert.equal((window.endMs - window.startMs) / 3_600_000, 7, `${date} is a full seven-hour working day`);
    const list = generateStartTimes({ windows: [window], durationMinutes: 60, bookings: [], hardBlocks: [] }).map(local);
    assert.equal(list[0], "09:00");
    assert.equal(list.at(-1), "15:00");
  }
});

test("free intervals on the calendar match what the slot engine will accept", () => {
  const bookings = [booking("09:00", "10:00"), booking("12:00", "12:45")];
  const hard: HardBlock[] = [{ kind: "time_off", startMs: at("15:00"), endMs: at("17:00") }];
  const free = freeIntervals(windowsFor(), bookings, hard).map((item) => `${local(item.startMs)}-${local(item.endMs)}`);
  assert.deepEqual(free, ["08:00-09:00", "10:05-12:00", "12:50-15:00", "17:00-21:00"]);
});

test("an appointment finished before its start occupies nothing", () => {
  const start = "2026-10-06T18:00:00.000Z";
  const end = "2026-10-06T19:00:00.000Z";
  const nowMs = Date.parse("2026-10-06T17:10:00.000Z");
  assert.equal(appointmentOccupancy({ status: "completed", starts_at: start, ends_at: end, completed_at: "2026-10-06T17:05:00.000Z" }, nowMs), null);
  assert.equal(appointmentOccupancy({ status: "completed", starts_at: start, ends_at: end, completed_at: start }, nowMs), null);
  // Finished one minute in: occupied for that minute only.
  assert.deepEqual(appointmentOccupancy({ status: "completed", starts_at: start, ends_at: end, completed_at: "2026-10-06T18:01:00.000Z" }, nowMs), {
    kind: "completed",
    startMs: Date.parse(start),
    endMs: Date.parse("2026-10-06T18:01:00.000Z"),
  });
});

test("only confirmed bookings, and paid bookings that lost their time, can be moved", () => {
  assert.equal(isReschedulable("confirmed", "paid"), true);
  assert.equal(isReschedulable("rescheduled", "paid"), true);
  assert.equal(isReschedulable("expired", "paid"), true);
  assert.equal(isReschedulable("expired", "pending"), false);
  assert.equal(isReschedulable("expired", null), false);
  for (const status of ["pending_confirmation", "checked_in", "in_service", "completed", "cancelled_by_client", "no_show"]) {
    assert.equal(isReschedulable(status, "paid"), false, status);
  }
});

test("a staff calendar lists every appointment that holds a barber's time, whatever its payment state", async () => {
  const rules = await import("../../src/lib/booking/rules.ts");
  const depositStates = ["not_required", "pending", "paid", "refunded", "failed", null];
  const now = Date.parse("2026-10-06T12:00:00Z");
  const base = { starts_at: "2026-10-06T13:00:00Z", ends_at: "2026-10-06T14:00:00Z", hold_expires_at: null, completed_at: null };
  for (const status of [...rules.ACTIVE_STATUSES, rules.COMPLETED_STATUS]) {
    for (const deposit of depositStates) {
      // The engine blocks this time...
      assert.ok(rules.appointmentOccupancy({ ...base, status, deposit_status: deposit }, now), `${status}/${deposit} should occupy time`);
      // ...so staff must be able to see it.
      assert.equal(rules.showsOnStaffSchedule(status, deposit), true, `${status}/${deposit} must be listed`);
    }
  }
  // Abandoned checkouts and unpaid history stay out of the staff view.
  for (const status of ["expired", "cancelled_by_client", "cancelled_by_business", "no_show", "declined", "failed"]) {
    assert.equal(rules.showsOnStaffSchedule(status, "pending"), false);
    assert.equal(rules.showsOnStaffSchedule(status, "paid"), true);
  }
  // The database filter is the same rule.
  assert.equal(rules.STAFF_SCHEDULE_FILTER, "deposit_status.eq.paid,status.in.(confirmed,checked_in,assigned,in_service,completed)");
});

test("a 24-hour reminder is decided again from the appointment as it is when it is due", async () => {
  const { reminderDecision, reminderTimeFor, reminderKey } = await import("../../src/lib/appointments/reminder-policy.ts");
  const now = Date.parse("2026-10-05T14:00:00Z");
  const inHours = (hours: number) => new Date(now + hours * 3_600_000).toISOString();
  // Still confirmed and due tomorrow: send.
  assert.deepEqual(reminderDecision({ status: "confirmed", starts_at: inHours(24) }, now), { action: "send" });
  assert.deepEqual(reminderDecision({ status: "confirmed", starts_at: inHours(25.5) }, now), { action: "send" });
  // Cancelled, no-show, released or deleted since it was queued: never send.
  for (const status of ["cancelled_by_client", "cancelled_by_business", "no_show", "expired", "completed", "pending_confirmation"]) {
    assert.equal(reminderDecision({ status, starts_at: inHours(24) }, now).action, "cancel", status);
  }
  assert.equal(reminderDecision(null, now).action, "cancel");
  // Already started: never send.
  assert.equal(reminderDecision({ status: "confirmed", starts_at: inHours(-1) }, now).action, "cancel");
  // Moved to a later day: wait, and remind 24 hours before the new time.
  assert.deepEqual(reminderDecision({ status: "confirmed", starts_at: inHours(72) }, now), { action: "defer", scheduledFor: inHours(48) });
  // When an appointment moves, its reminder moves with it, unless the new time is under a day away.
  assert.equal(reminderTimeFor(inHours(72), now), inHours(48));
  assert.equal(reminderTimeFor(inHours(10), now), null);
  assert.equal(reminderKey("abc"), "booking-reminder-24h:abc");
});

test("client and barber portal lists use the engine's statuses", async () => {
  const rules = await import("../../src/lib/booking/rules.ts");
  // Upcoming for a client: only bookings that still hold or reserve a time.
  for (const status of rules.BLOCKING_STATUSES) assert.equal(rules.isOpenAppointmentStatus(status), true, status);
  for (const status of [...rules.NON_BLOCKING_STATUSES, rules.COMPLETED_STATUS]) assert.equal(rules.isOpenAppointmentStatus(status), false, status);
});
