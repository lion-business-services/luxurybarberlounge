import "server-only";

import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareIsConfigured } from "@/lib/square/config";
import { squareRequest, SquareApiError } from "@/lib/square/client";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;

/** Appointment statuses whose unpaid Square checkout links must no longer be payable. */
const DEAD_STATUSES = ["expired", "declined", "failed", "cancelled_by_client", "cancelled_by_business"];

export type HoldCleanupResult = {
  expired: number;
  linksCancelled: number;
  linkErrors: number;
};

/**
 * Housekeeping for checkout holds. Availability does NOT depend on this job:
 * an expired hold stops blocking the instant its window passes, both in the
 * slot engine and in the database guard. This job only makes the stored state
 * tidy and closes the matching Square checkout so nobody can pay for a
 * reservation that no longer exists.
 */
export async function expireUnpaidHolds(admin: AdminClient, options: { linkLimit?: number } = {}): Promise<HoldCleanupResult> {
  const { data: expiredRows, error: expireError } = await admin.rpc("expire_unpaid_appointment_holds", { p_limit: 200 });
  if (expireError) {
    console.error("booking-hold-expiry", { code: "EXPIRE_RPC_FAILED", dbCode: expireError.code, dbMessage: expireError.message?.slice(0, 200) });
    throw new Error("HOLD_EXPIRY_UNAVAILABLE");
  }
  const expired = Array.isArray(expiredRows) ? expiredRows.length : 0;
  if (expired > 0) {
    console.info("booking-hold-expiry", {
      expired,
      appointments: (expiredRows as Array<{ id: string; barber_profile_id: string; starts_at: string }>).slice(0, 20).map((row) => ({ id: row.id, barberId: row.barber_profile_id, start: row.starts_at })),
    });
  }

  let linksCancelled = 0;
  let linkErrors = 0;

  const { data: openLinks, error: linkError } = await admin
    .from("appointment_payment_links")
    .select("id,appointment_id,square_payment_link_id")
    .eq("status", "created")
    .order("created_at", { ascending: true })
    .limit(300);
  if (linkError || !openLinks?.length) return { expired, linksCancelled, linkErrors };

  const appointmentIds = [...new Set(openLinks.map((link) => String(link.appointment_id)))];
  const { data: deadAppointments } = await admin
    .from("appointments")
    .select("id")
    .in("id", appointmentIds)
    .in("status", DEAD_STATUSES);
  const dead = new Set((deadAppointments ?? []).map((row) => String(row.id)));
  const targets = openLinks.filter((link) => dead.has(String(link.appointment_id))).slice(0, options.linkLimit ?? 25);

  for (const link of targets) {
    const squareLinkId = String(link.square_payment_link_id ?? "");
    try {
      if (squareIsConfigured && squareLinkId) {
        await squareRequest(`/v2/online-checkout/payment-links/${encodeURIComponent(squareLinkId)}`, { method: "DELETE" });
      }
    } catch (error) {
      // A link Square no longer knows about is already unusable.
      if (!(error instanceof SquareApiError && error.status === 404)) {
        linkErrors += 1;
        console.error("booking-hold-expiry", { code: "SQUARE_LINK_CANCEL_FAILED", linkId: link.id, status: error instanceof SquareApiError ? error.status : null });
        continue;
      }
    }
    if (!squareIsConfigured) continue;
    const { error } = await admin
      .from("appointment_payment_links")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", link.id)
      .eq("status", "created");
    if (error) linkErrors += 1;
    else linksCancelled += 1;
  }

  return { expired, linksCancelled, linkErrors };
}
