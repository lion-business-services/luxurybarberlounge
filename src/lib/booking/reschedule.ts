import "server-only";

import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { checkPlacement } from "@/lib/booking/availability";
import { queueAppointmentChangeNotifications } from "@/lib/booking/change-notifications";
import {
  schedulingErrorMessage,
  schedulingErrorReason,
  schedulingErrorStatus,
  type SchedulingErrorReason,
} from "@/lib/booking/observability";
import { PAID_UNPLACED_STATUS, isReschedulable } from "@/lib/booking/rules";
import { businessConfig } from "@/lib/config/business";

/**
 * The ONE way an appointment is moved to another time or another barber.
 *
 * Used by the admin calendar (drag and drop and the form), the client portal
 * and the guest manage link, so all three follow identical rules:
 *
 *   1. the pure engine explains a rejection in plain words (no write happens),
 *   2. reschedule_appointment_atomic moves the booking inside one transaction
 *      under the barber calendar lock: the old time is freed and the new time
 *      is blocked together, or nothing changes at all,
 *   3. only after the commit, exactly one client notification is queued.
 *      A notification problem never undoes the move.
 */

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;

export type MovableAppointment = {
  id: string;
  business_id: string;
  location_id: string;
  barber_profile_id: string;
  starts_at: string;
  ends_at: string;
  timezone: string | null;
  status: string;
  deposit_status?: string | null;
  public_reference: string;
};

export type MoveRequest = {
  appointment: MovableAppointment;
  startsAt: string;
  /** Omit to keep the current barber. */
  barberProfileId?: string | null;
  actorUserId: string | null;
  actorRole: string;
  reason: string;
  correlationId: string;
  locationName?: string | null;
};

export type MoveResult =
  | { ok: true; changed: boolean; appointment: Record<string, unknown>; notificationQueued: boolean }
  | { ok: false; reason: SchedulingErrorReason; message: string; status: number };

function rejected(reason: SchedulingErrorReason): MoveResult {
  return { ok: false, reason, message: schedulingErrorMessage(reason), status: schedulingErrorStatus(reason) };
}

function log(level: "info" | "warn" | "error", event: string, request: MoveRequest, extra: Record<string, unknown>) {
  // Identifiers, times and reason codes only. No client details.
  console[level]("booking-reschedule", {
    event,
    correlationId: request.correlationId,
    appointmentId: request.appointment.id,
    actorRole: request.actorRole,
    fromBarber: request.appointment.barber_profile_id,
    toBarber: request.barberProfileId ?? request.appointment.barber_profile_id,
    fromStartsAt: request.appointment.starts_at,
    toStartsAt: request.startsAt,
    ...extra,
  });
}

export async function moveAppointment(admin: AdminClient, request: MoveRequest): Promise<MoveResult> {
  const { appointment } = request;
  const start = new Date(request.startsAt);
  if (!Number.isFinite(start.getTime())) return rejected("outside_schedule");

  const targetBarber = request.barberProfileId || appointment.barber_profile_id;
  const durationMinutes = Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000);
  const timezone = appointment.timezone || businessConfig.timezone;
  const startsAt = start.toISOString();
  const sameTime = new Date(appointment.starts_at).getTime() === start.getTime();
  const sameBarber = targetBarber === appointment.barber_profile_id;

  if (!isReschedulable(appointment.status, appointment.deposit_status)) {
    log("warn", "rejected", request, { reason: "not_reschedulable", status: appointment.status });
    return rejected("not_reschedulable");
  }

  // A repeated request for a move that already happened is a no-op, not an
  // error. A paid booking that holds no time yet is always a real placement.
  const unplaced = appointment.status === PAID_UNPLACED_STATUS;
  if (unplaced || !(sameTime && sameBarber)) {
    try {
      const placement = await checkPlacement(admin, {
        locationId: appointment.location_id,
        timezone,
        barberId: targetBarber,
        startsAt,
        durationMinutes,
        excludeAppointmentId: appointment.id,
        // Handing an appointment to another barber at its existing time must
        // stay possible after it has started; the time itself is not changing.
        ignorePast: sameTime && !unplaced,
      });
      if (!placement.ok) {
        log("warn", "rejected", request, { reason: placement.reason, conflictId: placement.conflictId ?? null, stage: "precheck", durationMinutes });
        return rejected(placement.reason);
      }
    } catch {
      // Fail closed: if the schedule cannot be read, nothing is moved.
      log("error", "precheck_unavailable", request, {});
      return rejected("unknown");
    }
  }

  const { data, error } = await admin.rpc("reschedule_appointment_atomic", {
    p_appointment_id: appointment.id,
    p_starts_at: startsAt,
    p_ends_at: new Date(start.getTime() + durationMinutes * 60_000).toISOString(),
    p_actor: request.actorUserId,
    p_actor_role: request.actorRole,
    p_reason: request.reason,
    p_barber_profile_id: sameBarber ? null : targetBarber,
  });

  if (error || !data) {
    const reason = schedulingErrorReason(error);
    log(reason === "unknown" ? "error" : "warn", "rejected", request, { reason, stage: "database", code: error?.code ?? null });
    return rejected(reason);
  }

  const updated = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  const changed = unplaced || !(sameTime && sameBarber);
  log("info", changed ? "committed" : "unchanged", request, { durationMinutes, rescheduleCount: updated.reschedule_count ?? null });

  let notificationQueued = false;
  if (changed) {
    try {
      const result = await queueAppointmentChangeNotifications(
        admin,
        updated as Parameters<typeof queueAppointmentChangeNotifications>[1],
        sameTime && !unplaced ? "barber_changed" : "rescheduled",
        { location: request.locationName, previousStartsAt: appointment.starts_at },
      );
      notificationQueued = result.queued;
    } catch (caught) {
      // The move is committed. Delivery is retried by the notifications cron.
      console.error("booking-reschedule", {
        event: "notification_failed",
        correlationId: request.correlationId,
        appointmentId: appointment.id,
        code: caught instanceof Error ? caught.message.slice(0, 120) : "UNKNOWN",
      });
    }
  }

  return { ok: true, changed, appointment: updated, notificationQueued };
}
