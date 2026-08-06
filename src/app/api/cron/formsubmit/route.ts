import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { sendFormSubmitBooking } from "@/lib/email/formsubmit";

export async function GET(request: NextRequest) {
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || received !== process.env.CRON_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: rows, error } = await admin.from("formsubmit_deliveries").select("id,appointment_id,status,attempt_count,next_attempt_at,appointments(*)").in("status", ["queued", "failed", "retrying", "awaiting_activation"]).or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`).order("created_at").limit(20);
  if (error) return NextResponse.json({ ok: false, message: "FormSubmit retry queue unavailable." }, { status: 503 });
  let sent = 0; let failed = 0; let awaitingActivation = 0;
  for (const row of rows ?? []) {
    const appointment = Array.isArray(row.appointments) ? row.appointments[0] : row.appointments;
    if (!appointment?.id) continue;
    const claimed = await admin.from("formsubmit_deliveries").update({ status: "processing", attempt_count: Number(row.attempt_count ?? 0) + 1, last_error: null }).eq("id", row.id).in("status", ["queued", "failed", "retrying", "awaiting_activation"]).select("id").maybeSingle();
    if (!claimed.data) continue;
    const result = await sendFormSubmitBooking(appointment);
    const attempt = Number(row.attempt_count ?? 0) + 1;
    const terminal = attempt >= 8;
    const nextStatus = result.status === "failed" && !terminal ? "retrying" : result.status;
    await Promise.all([
      admin.from("formsubmit_deliveries").update({ status: nextStatus, response_status: result.responseStatus, sanitized_response: result.response, last_error: result.error, sent_at: result.status === "sent" ? new Date().toISOString() : null, next_attempt_at: result.status === "sent" || terminal ? null : new Date(Date.now() + Math.min(60, 2 ** Math.min(attempt, 5)) * 60_000).toISOString() }).eq("id", row.id),
      admin.from("appointments").update({ formsubmit_status: nextStatus }).eq("id", appointment.id),
    ]);
    if (result.status === "sent") sent += 1; else if (result.status === "awaiting_activation") awaitingActivation += 1; else failed += 1;
  }
  return NextResponse.json({ ok: true, processed: (rows ?? []).length, sent, awaitingActivation, failed });
}
