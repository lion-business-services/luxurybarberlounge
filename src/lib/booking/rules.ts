/**
 * Luxury Barber Lounge scheduling rules: the one application-layer definition.
 *
 * SOURCE OF TRUTH
 * ---------------
 * Supabase (appointments, barber_schedules, barber_time_off, barber_breaks,
 * business_hours, holiday_hours) is the scheduling source of truth.
 * Square is the payment source of truth. Square Appointments is NOT used to
 * decide whether a barber is free, so there is exactly one availability engine.
 *
 * DATABASE MIRROR
 * ---------------
 * The same rules are enforced inside Postgres by
 * supabase/migrations/202610020001_scheduling_single_source_of_truth.sql
 * (trigger enforce_appointment_barber_availability, exclusion constraint
 * appointments_no_buffered_overlap, and the *_atomic RPCs). The integration
 * test "application and database scheduling rules agree" fails the build when
 * the two drift apart.
 *
 * This file must stay dependency-free so the public booking page, the admin
 * calendar (browser), API routes (server) and node:test can all import it.
 */

export const SCHEDULING_SOURCE_OF_TRUTH = "supabase" as const;

/** Exact gap required between two consecutive appointments of one barber. */
export const BOOKING_BUFFER_MINUTES = 5;

/** How long an unpaid website checkout keeps a time reserved. */
export const CHECKOUT_HOLD_MINUTES = 15;

/** Regular start-time grid, measured from the start of each working window. */
export const SLOT_GRID_MINUTES = 15;

/** Calendar drag-and-drop snaps to this granularity so a 12:50 start is reachable. */
export const CALENDAR_SNAP_MINUTES = 5;

/** No hidden lead time: a slot is bookable until the moment it starts. */
export const MINIMUM_LEAD_MINUTES = 0;

export const MAXIMUM_ADVANCE_DAYS = 90;

/** Finish is refused when an appointment starts further away than this. */
export const EARLY_FINISH_GUARD_MINUTES = 120;

export const MAX_FAMILY_CHILDREN = 5;

/** Unpaid checkout holds. They block only while the hold window is open. */
export const HOLD_STATUSES = ["slot_held", "pending_confirmation"] as const;

/** Paid, operational appointments. They always block their time. */
export const ACTIVE_STATUSES = ["confirmed", "checked_in", "assigned", "in_service"] as const;

/** Every status that can occupy a barber's time. Nothing else blocks. */
export const BLOCKING_STATUSES = [...HOLD_STATUSES, ...ACTIVE_STATUSES] as const;

export const COMPLETED_STATUS = "completed" as const;

/** Statuses that never block availability, listed for documentation and tests. */
export const NON_BLOCKING_STATUSES = [
  "draft",
  "rescheduled",
  "cancelled_by_client",
  "cancelled_by_business",
  "no_show",
  "declined",
  "expired",
  "failed",
] as const;

/** Statuses drawn on a staff timeline: they occupy, or occupied, a barber's time. */
export const TIMELINE_STATUSES = [...ACTIVE_STATUSES, COMPLETED_STATUS] as const;

/**
 * What a staff calendar must list.
 *
 * An appointment that occupies a barber's time is ALWAYS listed, whatever its
 * payment state, because the booking engine blocks that time whatever the
 * payment state. A calendar that hid it would show time as open that nobody
 * can book. Everything else (cancelled, no-show, a paid booking waiting for a
 * new time) is history and is listed only when it was paid, which keeps
 * abandoned checkouts out of the staff view.
 */
export function showsOnStaffSchedule(status: string, depositStatus?: string | null) {
  return (TIMELINE_STATUSES as readonly string[]).includes(status) || depositStatus === "paid";
}

/** showsOnStaffSchedule as a PostgREST `or` filter, for the queries behind the staff calendars. */
export const STAFF_SCHEDULE_FILTER = `deposit_status.eq.paid,status.in.(${TIMELINE_STATUSES.join(",")})`;

export const RESCHEDULABLE_STATUSES = ["confirmed", "rescheduled"] as const;

/**
 * A booking whose payment arrived after its checkout hold had lapsed and whose
 * time had been taken. It holds no time, and staff place it at a new time.
 */
export const PAID_UNPLACED_STATUS = "expired" as const;

/** Mirrors reschedule_appointment_atomic: what staff, clients and guests may move. */
export function isReschedulable(status: string, depositStatus?: string | null) {
  return (RESCHEDULABLE_STATUSES as readonly string[]).includes(status) || (status === PAID_UNPLACED_STATUS && depositStatus === "paid");
}

/** A booking that is still ahead of the client: it holds, or is reserving, a time. */
export function isOpenAppointmentStatus(status: string) {
  return (BLOCKING_STATUSES as readonly string[]).includes(status);
}

export const FINISHABLE_STATUSES = ["confirmed", "checked_in", "assigned", "in_service"] as const;

/** Only approved, "unavailable" barber time off removes time from booking. */
export const TIME_OFF_BLOCKING_STATUS = "approved" as const;
export const TIME_OFF_BLOCKING_KIND = "unavailable" as const;

/** Only scheduled breaks remove time from booking. */
export const BREAK_BLOCKING_STATUS = "scheduled" as const;

export type BlockingStatus = (typeof BLOCKING_STATUSES)[number];

export type OccupancyInput = {
  status: string;
  starts_at: string;
  ends_at: string;
  deposit_status?: string | null;
  hold_expires_at?: string | null;
  completed_at?: string | null;
};

export type Occupancy = {
  kind: "appointment" | "hold" | "completed";
  startMs: number;
  /** When the barber stops working on this client. No buffer included. */
  endMs: number;
};

const MINUTE = 60_000;

export function minutes(value: number) {
  return value * MINUTE;
}

/** Accepts the database setting when it is a sane whole number, otherwise the rule default. */
export function resolveBufferMinutes(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 120 ? parsed : BOOKING_BUFFER_MINUTES;
}

export function isHoldStatus(status: string) {
  return (HOLD_STATUSES as readonly string[]).includes(status);
}

export function isActiveStatus(status: string) {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

/**
 * An unpaid hold blocks only until it expires. A hold whose payment has been
 * verified, or a legacy hold with no recorded expiry, keeps blocking so a paid
 * client can never be double-booked.
 */
export function holdIsLive(row: Pick<OccupancyInput, "deposit_status" | "hold_expires_at">, nowMs: number) {
  if (row.deposit_status === "paid") return true;
  if (!row.hold_expires_at) return true;
  return new Date(row.hold_expires_at).getTime() > nowMs;
}

/**
 * The time an appointment record actually occupies, or null when it does not
 * block anything. Every availability decision in the application goes
 * through this function.
 */
export function appointmentOccupancy(row: OccupancyInput, nowMs: number): Occupancy | null {
  const startMs = new Date(row.starts_at).getTime();
  const scheduledEndMs = new Date(row.ends_at).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(scheduledEndMs) || scheduledEndMs <= startMs) return null;

  if (isActiveStatus(row.status)) return { kind: "appointment", startMs, endMs: scheduledEndMs };

  if (isHoldStatus(row.status)) {
    return holdIsLive(row, nowMs) ? { kind: "hold", startMs, endMs: scheduledEndMs } : null;
  }

  if (row.status === COMPLETED_STATUS) {
    // Finishing early releases the unused part of the reservation. Finishing
    // late never extends it: the appointment is already in the past by then.
    const completedMs = row.completed_at ? new Date(row.completed_at).getTime() : scheduledEndMs;
    const endMs = Math.min(scheduledEndMs, Number.isFinite(completedMs) ? completedMs : scheduledEndMs);
    // Finished before it was due to start: it never occupied the chair.
    if (endMs <= startMs) return null;
    return { kind: "completed", startMs, endMs };
  }

  return null;
}

export function familyTierSlug(childCount: number) {
  return `family-${childCount}`;
}

export function parseFamilyTier(slug: string | null | undefined) {
  const match = /^family-(\d)$/.exec(String(slug ?? ""));
  if (!match) return null;
  const childCount = Number(match[1]);
  return childCount >= 1 && childCount <= MAX_FAMILY_CHILDREN ? childCount : null;
}
