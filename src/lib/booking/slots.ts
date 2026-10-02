/**
 * Deterministic slot engine shared by the public booking API, the booking
 * submit guard, admin/guest/client rescheduling and the admin calendar's
 * drag-and-drop preview. It is pure: no database, no clock, no globals.
 *
 * RULE (identical to the Postgres guard):
 * a start S with duration D is bookable for a barber when
 *   1. [S, S+D) lies inside one of the barber's working windows for that day
 *      (saved schedule, clamped to the lounge's opening hours),
 *   2. [S, S+D) does not overlap approved unavailable time or a scheduled break,
 *   3. for every occupying appointment or live checkout hold [bs, be):
 *        S >= be + buffer   OR   S + D + buffer <= bs
 * The buffer is applied once between two neighbouring appointments. It is not
 * required before closing time or before time off.
 */

import { BOOKING_BUFFER_MINUTES, SLOT_GRID_MINUTES, minutes } from "./rules.ts";
import { zonedDateTimeToUtc } from "./timezone.ts";

export type Interval = { startMs: number; endMs: number };

/** A barber's time taken by a client. endMs is the service end, without buffer. */
export type BookingBlock = Interval & { kind: "appointment" | "hold" | "completed"; id?: string };

/** Time removed from the working day. No buffer applies around it. */
export type HardBlock = Interval & { kind: "time_off" | "break"; id?: string };

export type PlacementRejection =
  | "past"
  | "too_far_ahead"
  | "outside_schedule"
  | "time_off"
  | "break"
  | "appointment"
  | "hold"
  | "buffer";

export type PlacementResult =
  | { ok: true }
  | { ok: false; reason: PlacementRejection; conflictId?: string };

export type PlacementInput = {
  startMs: number;
  durationMinutes: number;
  bufferMinutes?: number;
  windows: Interval[];
  bookings: BookingBlock[];
  hardBlocks: HardBlock[];
  /** Earliest allowed start. Omit to skip the check (historical views). */
  earliestMs?: number;
  /** Latest allowed start. */
  latestMs?: number;
};

export type ScheduleRow = {
  barber_profile_id: string;
  weekday: number | string;
  starts_at: string | null;
  ends_at: string | null;
  effective_from: string | null;
  effective_to: string | null;
  active?: boolean | null;
};

export type ShopDay = { open: string; close: string } | null;

function clock(value: string | null | undefined) {
  return value ? value.slice(0, 8).padEnd(8, ":00").slice(0, 8) : null;
}

/**
 * The lounge's opening hours for one date. A holiday row replaces the weekly
 * row. Returns null when the lounge is closed.
 */
export function shopDayFor(
  date: string,
  weekday: number,
  businessHours: Array<{ weekday: number | string; opens_at: string | null; closes_at: string | null; closed: boolean | null }>,
  holidayHours: Array<{ service_date: string; opens_at: string | null; closes_at: string | null; closed: boolean | null }>,
): ShopDay {
  const holiday = holidayHours.find((item) => item.service_date === date);
  const regular = businessHours.find((item) => Number(item.weekday) === weekday);
  const row = holiday ?? regular;
  if (!row || row.closed) return null;
  const open = clock(row.opens_at);
  const close = clock(row.closes_at);
  return open && close && open < close ? { open, close } : null;
}

/**
 * A barber's working windows for one local date, as "HH:MM:SS" pairs:
 * every active schedule row effective that day, clamped to opening hours,
 * with touching or overlapping rows merged.
 */
export function scheduleWindowsForDate(
  schedules: ScheduleRow[],
  barberId: string,
  weekday: number,
  date: string,
  shop: ShopDay,
) {
  if (!shop) return [] as Array<{ open: string; close: string }>;
  const windows = schedules.flatMap((item) => {
    if (
      item.barber_profile_id !== barberId ||
      item.active === false ||
      Number(item.weekday) !== weekday ||
      (item.effective_from && item.effective_from > date) ||
      (item.effective_to && item.effective_to < date)
    ) {
      return [];
    }
    const startsAt = clock(item.starts_at);
    const endsAt = clock(item.ends_at);
    if (!startsAt || !endsAt) return [];
    const open = startsAt > shop.open ? startsAt : shop.open;
    const close = endsAt < shop.close ? endsAt : shop.close;
    return open < close ? [{ open, close }] : [];
  });

  windows.sort((a, b) => a.open.localeCompare(b.open) || a.close.localeCompare(b.close));

  return windows.reduce<Array<{ open: string; close: string }>>((merged, window) => {
    const previous = merged.at(-1);
    if (!previous || window.open > previous.close) {
      merged.push({ ...window });
      return merged;
    }
    if (window.close > previous.close) previous.close = window.close;
    return merged;
  }, []);
}

/** Converts local working windows to absolute instants in the lounge timezone. */
export function toUtcWindows(date: string, windows: Array<{ open: string; close: string }>, timeZone: string): Interval[] {
  return windows.map((window) => ({
    startMs: zonedDateTimeToUtc(date, window.open, timeZone).getTime(),
    endMs: zonedDateTimeToUtc(date, window.close, timeZone).getTime(),
  }));
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

/** Decides whether one exact start time is bookable, and why not when it is not. */
export function evaluatePlacement(input: PlacementInput): PlacementResult {
  const buffer = minutes(input.bufferMinutes ?? BOOKING_BUFFER_MINUTES);
  const start = input.startMs;
  const end = start + minutes(input.durationMinutes);

  if (input.earliestMs !== undefined && start < input.earliestMs) return { ok: false, reason: "past" };
  if (input.latestMs !== undefined && start > input.latestMs) return { ok: false, reason: "too_far_ahead" };

  if (!input.windows.some((window) => start >= window.startMs && end <= window.endMs)) {
    return { ok: false, reason: "outside_schedule" };
  }

  for (const block of input.hardBlocks) {
    if (overlaps(start, end, block.startMs, block.endMs)) return { ok: false, reason: block.kind, conflictId: block.id };
  }

  for (const block of input.bookings) {
    if (overlaps(start, end, block.startMs, block.endMs)) {
      return { ok: false, reason: block.kind === "hold" ? "hold" : "appointment", conflictId: block.id };
    }
    if (overlaps(start, end + buffer, block.startMs, block.endMs + buffer)) {
      return { ok: false, reason: "buffer", conflictId: block.id };
    }
  }

  return { ok: true };
}

export type StartTimesInput = Omit<PlacementInput, "startMs"> & { gridMinutes?: number };

/**
 * Every bookable start for one barber and one day.
 *
 * Candidates are the regular grid counted from each window's opening time
 * PLUS every "release point": the first instant after an appointment's buffer
 * and the first instant after time off or a break. That is what makes 12:50
 * bookable after a 12:45 finish instead of silently rounding it away.
 */
export function generateStartTimes(input: StartTimesInput): number[] {
  const buffer = minutes(input.bufferMinutes ?? BOOKING_BUFFER_MINUTES);
  const grid = minutes(Math.max(1, input.gridMinutes ?? SLOT_GRID_MINUTES));
  const duration = minutes(input.durationMinutes);
  const candidates = new Set<number>();

  for (const window of input.windows) {
    for (let cursor = window.startMs; cursor + duration <= window.endMs; cursor += grid) candidates.add(cursor);
    for (const block of input.bookings) {
      const release = block.endMs + buffer;
      if (release > window.startMs && release + duration <= window.endMs) candidates.add(release);
    }
    for (const block of input.hardBlocks) {
      if (block.endMs > window.startMs && block.endMs + duration <= window.endMs) candidates.add(block.endMs);
    }
  }

  return [...candidates]
    .filter((startMs) => evaluatePlacement({ ...input, startMs }).ok)
    .sort((a, b) => a - b);
}

/** The open stretches of a working day, for drawing free time on a calendar. */
export function freeIntervals(windows: Interval[], bookings: BookingBlock[], hardBlocks: HardBlock[], bufferMinutes = BOOKING_BUFFER_MINUTES): Interval[] {
  const buffer = minutes(bufferMinutes);
  const busy = [
    ...bookings.map((block) => ({ startMs: block.startMs, endMs: block.endMs + buffer })),
    ...hardBlocks.map((block) => ({ startMs: block.startMs, endMs: block.endMs })),
  ].sort((a, b) => a.startMs - b.startMs);

  const free: Interval[] = [];
  for (const window of windows) {
    let cursor = window.startMs;
    for (const block of busy) {
      if (block.endMs <= cursor || block.startMs >= window.endMs) continue;
      if (block.startMs > cursor) free.push({ startMs: cursor, endMs: Math.min(block.startMs, window.endMs) });
      cursor = Math.max(cursor, block.endMs);
      if (cursor >= window.endMs) break;
    }
    if (cursor < window.endMs) free.push({ startMs: cursor, endMs: window.endMs });
  }
  return free;
}

const REJECTION_MESSAGES: Record<PlacementRejection, string> = {
  past: "That time has already passed.",
  too_far_ahead: "That date is beyond the booking window.",
  outside_schedule: "That time is outside the barber's working hours.",
  time_off: "The barber is marked unavailable at that time.",
  break: "The barber has a scheduled break at that time.",
  appointment: "Another appointment already occupies that time.",
  hold: "A client is completing checkout for that time.",
  buffer: `That time is inside the ${BOOKING_BUFFER_MINUTES}-minute gap required between appointments.`,
};

export function rejectionMessage(reason: PlacementRejection) {
  return REJECTION_MESSAGES[reason];
}
