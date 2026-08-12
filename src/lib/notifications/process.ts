import "server-only";
import type { createUntypedAdminSupabase } from "@/lib/auth/server";
import { canDeliver } from "@/lib/automation/engine";
import { getEmailProvider, getSmsProvider } from "@/lib/notifications/providers";

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;

type ProcessOptions = {
  appointmentId?: string;
  limit?: number;
};

function interpolate(template: string, payload: Record<string, unknown>) {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) => {
    const value = key.split(".").reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, payload);
    return value == null ? "" : String(value);
  });
}

export async function processNotificationJobs(admin: AdminClient, options: ProcessOptions = {}) {
  let query = admin
    .from("notification_jobs")
    .select("id,business_id,user_id,channel,template_key,locale,recipient,payload,idempotency_key,status,attempt_count,max_attempts")
    .in("status", ["queued", "failed"])
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(options.limit ?? 50);
  if (options.appointmentId) query = query.contains("payload", { appointmentId: options.appointmentId });

  const { data: jobs, error } = await query;
  if (error) throw new Error("NOTIFICATION_QUEUE_UNAVAILABLE");

  let delivered = 0;
  let failed = 0;
  let suppressed = 0;
  let development = 0;

  for (const job of jobs ?? []) {
    const claimed = await admin
      .from("notification_jobs")
      .update({ status: "processing", attempt_count: Number(job.attempt_count ?? 0) + 1, last_error: null })
      .eq("id", job.id)
      .in("status", ["queued", "failed"])
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;

    const payload = job.payload && typeof job.payload === "object" ? job.payload as Record<string, unknown> : {};
    let template: { subject?: string | null; body?: string; transactional?: boolean } = {
      subject: typeof payload.subject === "string" ? payload.subject : null,
      body: typeof payload.body === "string" ? payload.body : "",
      transactional: payload.transactional !== false,
    };
    if (job.template_key && job.business_id) {
      const { data: record } = await admin
        .from("message_templates")
        .select("subject,body,transactional")
        .eq("business_id", job.business_id)
        .eq("key", job.template_key)
        .eq("channel", job.channel)
        .eq("locale", job.locale)
        .eq("status", "published")
        .maybeSingle();
      if (record) template = record;
    }

    let preferences = { email: true, sms: payload.smsConsent === true };
    let quietHours: { startHour: number; endHour: number } | undefined;
    if (job.user_id) {
      const { data: preference } = await admin
        .from("notification_preferences")
        .select("transactional_email,transactional_sms,marketing_email,marketing_sms,quiet_hours_start,quiet_hours_end")
        .eq("user_id", job.user_id)
        .maybeSingle();
      if (preference) {
        preferences = {
          email: template.transactional ? Boolean(preference.transactional_email) : Boolean(preference.marketing_email),
          sms: template.transactional ? Boolean(preference.transactional_sms) : Boolean(preference.marketing_sms),
        };
        if (preference.quiet_hours_start && preference.quiet_hours_end) {
          quietHours = {
            startHour: Number(String(preference.quiet_hours_start).slice(0, 2)),
            endHour: Number(String(preference.quiet_hours_end).slice(0, 2)),
          };
        }
      }
    }

    const decision = canDeliver({
      transactional: Boolean(template.transactional),
      channel: job.channel === "sms" ? "sms" : job.channel === "email" ? "email" : "in_app",
      consent: preferences,
      suppressed: !job.recipient,
      now: new Date(),
      quietHours,
    });
    if (!decision.allowed) {
      await admin.from("notification_jobs").update({ status: "suppressed", last_error: decision.reason }).eq("id", job.id);
      if (typeof payload.appointmentId === "string" && typeof payload.appointmentField === "string" && ["client_confirmation_status", "barber_notification_status"].includes(payload.appointmentField)) {
        await admin.from("appointments").update({ [payload.appointmentField]: "suppressed" }).eq("id", payload.appointmentId);
      }
      suppressed += 1;
      continue;
    }

    try {
      const requestData = {
        recipient: String(job.recipient),
        subject: template.subject ? interpolate(String(template.subject), payload) : undefined,
        body: interpolate(String(template.body ?? ""), payload),
        html: typeof payload.html === "string" ? interpolate(payload.html, payload) : undefined,
        idempotencyKey: String(job.idempotency_key),
        metadata: payload,
      };
      const result = job.channel === "sms" ? await getSmsProvider().send(requestData) : await getEmailProvider().send(requestData);
      await admin.from("notification_deliveries").insert({
        job_id: job.id,
        provider: result.provider,
        provider_message_id: result.providerMessageId,
        attempt: Number(job.attempt_count ?? 0) + 1,
        status: result.status,
        sanitized_response: { live: result.live },
      });

      if (result.live) {
        await admin.from("notification_jobs").update({ status: "delivered", last_error: null }).eq("id", job.id);
        if (typeof payload.appointmentId === "string" && typeof payload.appointmentField === "string" && ["client_confirmation_status", "barber_notification_status"].includes(payload.appointmentField)) {
          await admin.from("appointments").update({ [payload.appointmentField]: "sent" }).eq("id", payload.appointmentId);
        }
        delivered += 1;
      } else {
        // A provider deliberately running in development mode will not become
        // live by retrying the same job every few minutes. Suppress the stale
        // job once, surface the reason in admin, and let future jobs deliver
        // normally as soon as production provider credentials are configured.
        await admin
          .from("notification_jobs")
          .update({
            status: "suppressed",
            last_error: "Provider is in development mode. Configure production provider credentials to enable this channel.",
          })
          .eq("id", job.id);
        if (typeof payload.appointmentId === "string" && typeof payload.appointmentField === "string" && ["client_confirmation_status", "barber_notification_status"].includes(payload.appointmentField)) {
          await admin.from("appointments").update({ [payload.appointmentField]: "suppressed" }).eq("id", payload.appointmentId);
        }
        development += 1;
      }
    } catch (caught) {
      const attempt = Number(job.attempt_count ?? 0) + 1;
      const terminal = attempt >= Number(job.max_attempts ?? 4);
      const message = caught instanceof Error ? caught.message.slice(0, 1000) : "Delivery failed";
      await admin.from("notification_deliveries").insert({
        job_id: job.id,
        provider: job.channel === "sms" ? "twilio" : "resend",
        attempt,
        status: "failed",
        sanitized_response: {},
        error_message: message,
      });
      await admin.from("notification_jobs").update({
        status: terminal ? "failed" : "queued",
        last_error: message,
        scheduled_for: terminal ? new Date().toISOString() : new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000).toISOString(),
      }).eq("id", job.id);
      if (terminal && typeof payload.appointmentId === "string" && typeof payload.appointmentField === "string" && ["client_confirmation_status", "barber_notification_status"].includes(payload.appointmentField)) {
        await admin.from("appointments").update({ [payload.appointmentField]: "failed" }).eq("id", payload.appointmentId);
      }
      failed += 1;
    }
  }

  return { processed: (jobs ?? []).length, delivered, failed, suppressed, development };
}
