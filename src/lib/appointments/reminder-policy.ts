import { ACTIVE_STATUSES } from "../booking/rules.ts";

/**
 * What to do with a 24-hour reminder at the moment it is about to be sent.
 *
 * A reminder is queued when a booking is confirmed, sometimes weeks ahead.
 * By the time it is due the appointment may have been moved or cancelled, so
 * the decision is made again from the appointment as it is NOW, and the text
 * is written from the appointment as it is now. A reminder never repeats a
 * time that is no longer true.
 *
 * Pure: no database, no clock of its own.
 */

/** A reminder is sent when the appointment starts within this many hours. */
export const REMINDER_LEAD_HOURS = 24;
/** Slack for the job runner, so a reminder due "now" is not pushed back by a few minutes of drift. */
export const REMINDER_WINDOW_HOURS = 26;

export type ReminderAppointment = { status: string; starts_at: string } | null;

export type ReminderDecision =
  | { action: "send" }
  | { action: "cancel"; reason: string }
  | { action: "defer"; scheduledFor: string };

export function reminderDecision(appointment: ReminderAppointment, nowMs: number): ReminderDecision {
  if (!appointment) return { action: "cancel", reason: "The appointment no longer exists." };
  if (!(ACTIVE_STATUSES as readonly string[]).includes(appointment.status)) {
    return { action: "cancel", reason: `The appointment is ${appointment.status.replaceAll("_", " ")}, so no reminder is sent.` };
  }
  const startMs = new Date(appointment.starts_at).getTime();
  if (!Number.isFinite(startMs) || startMs <= nowMs) {
    return { action: "cancel", reason: "The appointment has already started." };
  }
  if (startMs - nowMs > REMINDER_WINDOW_HOURS * 3_600_000) {
    // The appointment was moved to a later time. Remind before the new time.
    return { action: "defer", scheduledFor: new Date(startMs - REMINDER_LEAD_HOURS * 3_600_000).toISOString() };
  }
  return { action: "send" };
}

/** When the reminder for a start time should go out, or null when that moment has already passed. */
export function reminderTimeFor(startsAt: string, nowMs: number): string | null {
  const dueMs = new Date(startsAt).getTime() - REMINDER_LEAD_HOURS * 3_600_000;
  return Number.isFinite(dueMs) && dueMs > nowMs ? new Date(dueMs).toISOString() : null;
}

export function reminderKey(appointmentId: string) {
  return `booking-reminder-24h:${appointmentId}`;
}
