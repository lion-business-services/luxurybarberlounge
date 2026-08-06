import { NextRequest, NextResponse } from "next/server";
import { queueUpcomingAppointmentReminders } from "@/lib/appointments/reminders";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await queueUpcomingAppointmentReminders()) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Appointment reminder processing failed." }, { status: 500 });
  }
}
