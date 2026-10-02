/**
 * Pure view-model for the staff calendars (Admin Portal and Barber Portal).
 *
 * It turns the facts returned by the calendar API into the SAME intervals the
 * booking engine uses (slots.ts + rules.ts), so what staff see on the timeline
 * and what the drag-and-drop preview allows is, by construction, the rule the
 * public booking page and the database guard apply. No second definition of
 * "busy" exists in the UI.
 *
 * Dependency-free: runs in the browser, on the server and under node:test.
 */

import {
  BOOKING_BUFFER_MINUTES,
  BREAK_BLOCKING_STATUS,
  MAXIMUM_ADVANCE_DAYS,
  TIME_OFF_BLOCKING_KIND,
  TIME_OFF_BLOCKING_STATUS,
  appointmentOccupancy,
  minutes,
} from "./rules.ts";
import {
  evaluatePlacement,
  generateStartTimes,
  scheduleWindowsForDate,
  shopDayFor,
  toUtcWindows,
  type BookingBlock,
  type HardBlock,
  type Interval,
  type PlacementResult,
  type ScheduleRow,
} from "./slots.ts";
import { addDays, weekdayForDate, zonedDateTimeToUtc, zonedParts } from "./timezone.ts";

export type CalendarAppointmentFact = {
  id: string;
  barber_profile_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  deposit_status?: string | null;
  hold_expires_at?: string | null;
  completed_at?: string | null;
};

export type CalendarBlockFact = {
  id: string;
  barber_profile_id: string;
  starts_at: string;
  ends_at: string;
  status?: string | null;
  availability_kind?: string | null;
};

export type CalendarFacts = {
  timezone: string;
  bufferMinutes: number;
  nowMs: number;
  schedules: ScheduleRow[];
  businessHours: Array<{ weekday: number | string; opens_at: string | null; closes_at: string | null; closed: boolean | null }>;
  holidayHours: Array<{ service_date: string; opens_at: string | null; closes_at: string | null; closed: boolean | null }>;
  timeOff: CalendarBlockFact[];
  breaks: CalendarBlockFact[];
  /** Paid appointments and live checkout holds together. */
  appointments: CalendarAppointmentFact[];
};

export type BarberDayModel = {
  /** Working windows for the date, already clamped to the lounge's hours. */
  windows: Interval[];
  /** Everything that occupies the barber's time (all dates, service time only). */
  bookings: BookingBlock[];
  /** Approved unavailable time and scheduled breaks (all dates). */
  hardBlocks: HardBlock[];
};

function ms(value: string) {
  return new Date(value).getTime();
}

/** Working windows for one barber on one local date. */
export function windowsFor(facts: CalendarFacts, barberId: string, date: string): Interval[] {
  const weekday = weekdayForDate(date);
  const shop = shopDayFor(date, weekday, facts.businessHours, facts.holidayHours);
  return toUtcWindows(date, scheduleWindowsForDate(facts.schedules, barberId, weekday, date, shop), facts.timezone);
}

/** Occupied time for one barber, optionally ignoring the appointment being moved. */
export function bookingsFor(facts: CalendarFacts, barberId: string, excludeAppointmentId?: string): BookingBlock[] {
  const blocks: BookingBlock[] = [];
  for (const row of facts.appointments) {
    if (row.barber_profile_id !== barberId || row.id === excludeAppointmentId) continue;
    const occupancy = appointmentOccupancy(row, facts.nowMs);
    if (occupancy) blocks.push({ ...occupancy, id: row.id });
  }
  return blocks;
}

export function hardBlocksFor(facts: CalendarFacts, barberId: string): HardBlock[] {
  return [
    ...facts.timeOff
      .filter((row) => row.barber_profile_id === barberId && (row.status ?? TIME_OFF_BLOCKING_STATUS) === TIME_OFF_BLOCKING_STATUS && (row.availability_kind ?? TIME_OFF_BLOCKING_KIND) === TIME_OFF_BLOCKING_KIND)
      .map((row) => ({ kind: "time_off" as const, id: row.id, startMs: ms(row.starts_at), endMs: ms(row.ends_at) })),
    ...facts.breaks
      .filter((row) => row.barber_profile_id === barberId && (row.status ?? BREAK_BLOCKING_STATUS) === BREAK_BLOCKING_STATUS)
      .map((row) => ({ kind: "break" as const, id: row.id, startMs: ms(row.starts_at), endMs: ms(row.ends_at) })),
  ];
}

export function barberDayModel(facts: CalendarFacts, barberId: string, date: string, excludeAppointmentId?: string): BarberDayModel {
  return {
    windows: windowsFor(facts, barberId, date),
    bookings: bookingsFor(facts, barberId, excludeAppointmentId),
    hardBlocks: hardBlocksFor(facts, barberId),
  };
}

export type MovePreviewInput = {
  appointmentId: string;
  durationMinutes: number;
  barberId: string;
  date: string;
  startMs: number;
};

/**
 * What the calendar shows while a card is being dragged. Advisory only: the
 * database makes the final decision when the move is saved.
 */
export function previewMove(facts: CalendarFacts, input: MovePreviewInput): PlacementResult {
  const model = barberDayModel(facts, input.barberId, input.date, input.appointmentId);
  return evaluatePlacement({
    startMs: input.startMs,
    durationMinutes: input.durationMinutes,
    bufferMinutes: facts.bufferMinutes ?? BOOKING_BUFFER_MINUTES,
    windows: model.windows,
    bookings: model.bookings,
    hardBlocks: model.hardBlocks,
    earliestMs: facts.nowMs,
    latestMs: facts.nowMs + minutes(MAXIMUM_ADVANCE_DAYS * 24 * 60),
  });
}

/** Every valid start for moving an appointment onto one barber's day. */
export function moveTargets(facts: CalendarFacts, input: Omit<MovePreviewInput, "startMs"> & { gridMinutes?: number }): number[] {
  const model = barberDayModel(facts, input.barberId, input.date, input.appointmentId);
  return generateStartTimes({
    durationMinutes: input.durationMinutes,
    bufferMinutes: facts.bufferMinutes ?? BOOKING_BUFFER_MINUTES,
    gridMinutes: input.gridMinutes,
    windows: model.windows,
    bookings: model.bookings,
    hardBlocks: model.hardBlocks,
    earliestMs: facts.nowMs,
    latestMs: facts.nowMs + minutes(MAXIMUM_ADVANCE_DAYS * 24 * 60),
  });
}

/** Minutes since local midnight in the lounge timezone (wall clock, DST-safe). */
export function localMinuteOfDay(instantMs: number, timeZone: string) {
  const parts = zonedParts(new Date(instantMs), timeZone);
  return parts.hour * 60 + parts.minute + parts.second / 60;
}

/** The instant for a wall-clock minute of a local date. */
export function instantForLocalMinute(date: string, minuteOfDay: number, timeZone: string) {
  const whole = Math.max(0, Math.min(24 * 60 - 1, Math.round(minuteOfDay)));
  const clock = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}:00`;
  return zonedDateTimeToUtc(date, clock, timeZone).getTime();
}

export function snapMinute(value: number, snap: number) {
  const step = Math.max(1, snap);
  return Math.round(value / step) * step;
}

/**
 * Where an interval sits inside one local day, as wall-clock minutes clipped
 * to [fromMinute, toMinute]. Returns null when it does not touch that day.
 */
export function clipToDay(interval: Interval, date: string, timeZone: string, fromMinute: number, toMinute: number) {
  const dayStart = zonedDateTimeToUtc(date, "00:00:00", timeZone).getTime();
  const dayEnd = zonedDateTimeToUtc(addDays(date, 1), "00:00:00", timeZone).getTime();
  if (interval.endMs <= dayStart || interval.startMs >= dayEnd) return null;
  const start = interval.startMs <= dayStart ? 0 : localMinuteOfDay(interval.startMs, timeZone);
  const end = interval.endMs >= dayEnd ? 24 * 60 : localMinuteOfDay(interval.endMs, timeZone);
  const top = Math.max(fromMinute, start);
  const bottom = Math.min(toMinute, end);
  return bottom > top ? { startMinute: top, endMinute: bottom } : null;
}

/**
 * The visible hour range for a set of dates: the earliest opening and latest
 * closing, widened to include any appointment that sits outside them.
 */
export function visibleRange(facts: CalendarFacts, dates: string[], fallback = { startMinute: 8 * 60, endMinute: 21 * 60 }) {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const date of dates) {
    const shop = shopDayFor(date, weekdayForDate(date), facts.businessHours, facts.holidayHours);
    if (shop) {
      const [openHour, openMinute] = shop.open.split(":").map(Number);
      const [closeHour, closeMinute] = shop.close.split(":").map(Number);
      start = Math.min(start, openHour * 60 + openMinute);
      end = Math.max(end, closeHour * 60 + closeMinute);
    }
    for (const row of facts.appointments) {
      const occupancy = appointmentOccupancy(row, facts.nowMs);
      if (!occupancy) continue;
      const clipped = clipToDay(occupancy, date, facts.timezone, 0, 24 * 60);
      if (!clipped) continue;
      start = Math.min(start, clipped.startMinute);
      end = Math.max(end, clipped.endMinute);
    }
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return fallback;
  return { startMinute: Math.floor(start / 60) * 60, endMinute: Math.ceil(end / 60) * 60 };
}
