import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { queueUpcomingAppointmentReminders } from "@/lib/appointments/reminders";
import { expireUnpaidHolds } from "@/lib/booking/holds";

export const dynamic = "force-dynamic";

/**
 * Runs every five minutes: releases abandoned checkout holds (and closes
 * their Square checkout links), then backfills 24-hour reminders. Each part
 * is independent, so a failure in one never blocks the other.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const result: Record<string, unknown> = {};
  let ok = true;

  const admin = createUntypedAdminSupabase();
  if (admin) {
    try {
      result.holds = await expireUnpaidHolds(admin);
    } catch (error) {
      ok = false;
      result.holds = { error: error instanceof Error ? error.message : "Hold expiry failed." };
    }
  } else {
    result.holds = { configured: false };
  }

  try {
    result.reminders = await queueUpcomingAppointmentReminders();
  } catch (error) {
    ok = false;
    result.reminders = { error: error instanceof Error ? error.message : "Appointment reminder processing failed." };
  }

  return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 500 });
}
