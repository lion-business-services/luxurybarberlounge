/**
 * Structured, privacy-safe logging helpers for scheduling decisions.
 *
 * Logs carry identifiers, times, durations and reason codes only. They never
 * include client names, emails, phone numbers, notes or payment details.
 */

import { BOOKING_BUFFER_MINUTES } from "./rules.ts";
import type { PlacementRejection } from "./slots.ts";

type HeaderReader = { get(name: string): string | null };

/** A stable id for one request, reused across every log line it produces. */
export function requestCorrelationId(headers: HeaderReader) {
  return (
    headers.get("x-vercel-id") ||
    headers.get("x-request-id") ||
    `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
}

export type SchedulingErrorReason =
  | PlacementRejection
  | "outside_business_hours"
  | "not_reschedulable"
  | "not_finishable"
  | "not_started"
  | "barber_not_eligible"
  | "barber_not_bookable"
  | "catalog_changed"
  | "invalid_family_booking"
  | "not_found"
  | "unknown";

type DatabaseError = { code?: string | null; message?: string | null; details?: string | null } | null | undefined;

/**
 * Maps an error raised by the Postgres scheduling guard or one of the atomic
 * RPCs to one stable reason code. The database is the final authority; this
 * only translates its verdict.
 */
export function schedulingErrorReason(error: DatabaseError): SchedulingErrorReason {
  const message = `${error?.message ?? ""}`;
  if (error?.code === "23P01" || /SLOT_CONFLICT/.test(message)) return /hold/i.test(`${error?.details ?? ""}`) ? "hold" : "appointment";
  if (/APPOINTMENT_OUTSIDE_BUSINESS_HOURS/.test(message)) return "outside_business_hours";
  if (/APPOINTMENT_OUTSIDE_BARBER_SCHEDULE|APPOINTMENT_OUTSIDE_BARBER_AVAILABILITY|INVALID_APPOINTMENT_WINDOW|INVALID_APPOINTMENT_RANGE/.test(message)) return "outside_schedule";
  if (/BARBER_UNAVAILABLE/.test(message)) return "time_off";
  if (/BARBER_ON_BREAK/.test(message)) return "break";
  if (/RESCHEDULE_IN_PAST/.test(message)) return "past";
  if (/APPOINTMENT_NOT_RESCHEDULABLE/.test(message)) return "not_reschedulable";
  if (/APPOINTMENT_NOT_FINISHABLE/.test(message)) return "not_finishable";
  if (/APPOINTMENT_NOT_STARTED/.test(message)) return "not_started";
  if (/BARBER_SERVICE_NOT_ELIGIBLE/.test(message)) return "barber_not_eligible";
  if (/BARBER_NOT_BOOKABLE/.test(message)) return "barber_not_bookable";
  if (/BOOKING_CATALOG_CHANGED/.test(message)) return "catalog_changed";
  if (/INVALID_FAMILY_BOOKING/.test(message)) return "invalid_family_booking";
  if (/APPOINTMENT_NOT_FOUND/.test(message)) return "not_found";
  return "unknown";
}

const MESSAGES: Record<SchedulingErrorReason, string> = {
  past: "That time has already passed.",
  too_far_ahead: "That date is beyond the booking window.",
  outside_schedule: "That time is outside the barber's working hours.",
  outside_business_hours: "That time is outside the lounge's opening hours.",
  time_off: "The barber is marked unavailable at that time.",
  break: "The barber has a scheduled break at that time.",
  appointment: `That time is taken, or too close to another appointment. Appointments need a ${BOOKING_BUFFER_MINUTES}-minute gap.`,
  hold: "A client is completing checkout for that time.",
  buffer: `That time is inside the ${BOOKING_BUFFER_MINUTES}-minute gap required between appointments.`,
  not_reschedulable: "Only confirmed appointments can be moved.",
  not_finishable: "This appointment can no longer be finished.",
  not_started: "This appointment has not started yet, so it cannot be finished.",
  barber_not_eligible: "That barber does not offer every service in this booking.",
  barber_not_bookable: "That barber is not available for booking.",
  catalog_changed: "Service details changed while you were booking. Please review the updated total and try again.",
  invalid_family_booking: "That family booking is not available. Please choose again.",
  not_found: "Appointment not found.",
  unknown: "The change could not be saved. Please try again.",
};

export function schedulingErrorMessage(reason: SchedulingErrorReason) {
  return MESSAGES[reason];
}

/** HTTP status for a scheduling rejection: conflicts are 409, bad input 422, the rest 503. */
export function schedulingErrorStatus(reason: SchedulingErrorReason) {
  if (reason === "unknown") return 503;
  if (reason === "not_found") return 404;
  return 409;
}
