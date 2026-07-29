import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { canDeliver } from "@/lib/automation/engine";
import { getEmailProvider, getSmsProvider } from "@/lib/notifications/providers";

function interpolate(template: string, payload: Record<string, unknown>) {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) => {
    const value = key.split(".").reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, payload);
    return value == null ? "" : String(value);
  });
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.nextUrl.searchParams.get("secret");
  if (!expected || received !== expected) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: jobs, error } = await admin.from("notification_jobs").select("id,business_id,user_id,channel,template_key,locale,recipient,payload,idempotency_key,status,attempt_count,max_attempts").in("status", ["queued","failed"]).lte("scheduled_for", new Date().toISOString()).order("scheduled_for", { ascending: true }).limit(50);
  if (error) return NextResponse.json({ ok: false, message: "Notification queue unavailable." }, { status: 503 });
  let delivered = 0, failed = 0, suppressed = 0;
  for (const job of jobs ?? []) {
    const claimed = await admin.from("notification_jobs").update({ status: "processing", attempt_count: Number(job.attempt_count ?? 0) + 1, last_error: null }).eq("id", job.id).in("status", ["queued","failed"]).select("id").maybeSingle();
    if (!claimed.data) continue;
    const payload = job.payload && typeof job.payload === "object" ? job.payload as Record<string, unknown> : {};
    let template: { subject?: string | null; body?: string; transactional?: boolean } = { subject: typeof payload.subject === "string" ? payload.subject : null, body: typeof payload.body === "string" ? payload.body : "", transactional: payload.transactional !== false };
    if (job.template_key && job.business_id) {
      const { data: record } = await admin.from("message_templates").select("subject,body,transactional").eq("business_id", job.business_id).eq("key", job.template_key).eq("channel", job.channel).eq("locale", job.locale).eq("status", "published").maybeSingle();
      if (record) template = record;
    }
    let preferences = { email: true, sms: false };
    let quietHours: { startHour: number; endHour: number } | undefined;
    if (job.user_id) {
      const { data: pref } = await admin.from("notification_preferences").select("transactional_email,transactional_sms,marketing_email,marketing_sms,quiet_hours_start,quiet_hours_end").eq("user_id", job.user_id).maybeSingle();
      if (pref) {
        preferences = { email: template.transactional ? Boolean(pref.transactional_email) : Boolean(pref.marketing_email), sms: template.transactional ? Boolean(pref.transactional_sms) : Boolean(pref.marketing_sms) };
        if (pref.quiet_hours_start && pref.quiet_hours_end) quietHours = { startHour: Number(String(pref.quiet_hours_start).slice(0,2)), endHour: Number(String(pref.quiet_hours_end).slice(0,2)) };
      }
    }
    const decision = canDeliver({ transactional: Boolean(template.transactional), channel: job.channel === "sms" ? "sms" : job.channel === "email" ? "email" : "in_app", consent: preferences, suppressed: !job.recipient, now: new Date(), quietHours });
    if (!decision.allowed) {
      await admin.from("notification_jobs").update({ status: "suppressed", last_error: decision.reason }).eq("id", job.id);
      suppressed += 1; continue;
    }
    try {
      const requestData = { recipient: String(job.recipient), subject: template.subject ? interpolate(String(template.subject), payload) : undefined, body: interpolate(String(template.body ?? ""), payload), html: typeof payload.html === "string" ? interpolate(payload.html, payload) : undefined, idempotencyKey: String(job.idempotency_key), metadata: payload };
      const result = job.channel === "sms" ? await getSmsProvider().send(requestData) : await getEmailProvider().send(requestData);
      await admin.from("notification_deliveries").insert({ job_id: job.id, provider: result.provider, provider_message_id: result.providerMessageId, attempt: Number(job.attempt_count ?? 0) + 1, status: result.status, sanitized_response: { live: result.live } });
      await admin.from("notification_jobs").update({ status: "delivered", last_error: null }).eq("id", job.id);
      delivered += 1;
    } catch (caught) {
      const attempt = Number(job.attempt_count ?? 0) + 1;
      const terminal = attempt >= Number(job.max_attempts ?? 4);
      const message = caught instanceof Error ? caught.message.slice(0, 1000) : "Delivery failed";
      await admin.from("notification_deliveries").insert({ job_id: job.id, provider: job.channel === "sms" ? "twilio" : "resend", attempt, status: "failed", sanitized_response: {}, error_message: message });
      await admin.from("notification_jobs").update({ status: terminal ? "failed" : "queued", last_error: message, scheduled_for: terminal ? new Date().toISOString() : new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000).toISOString() }).eq("id", job.id);
      failed += 1;
    }
  }
  return NextResponse.json({ ok: true, processed: (jobs ?? []).length, delivered, suppressed, failed });
}
