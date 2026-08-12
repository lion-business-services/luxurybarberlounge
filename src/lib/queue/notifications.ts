import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { features } from "@/lib/config/features";

type AdminClient = SupabaseClient;

type QueueNotificationInput = {
  businessId: string;
  entryId: string;
  clientId?: string | null;
  clientPhone?: string | null;
  smsConsent?: boolean;
  status: "assigned" | "called" | "ready";
  barberName?: string | null;
  estimatedWaitMinutes?: number | null;
};

function queueMessage(input: QueueNotificationInput) {
  const barber = input.barberName?.trim() || "your barber";
  if (input.status === "assigned") {
    const wait = typeof input.estimatedWaitMinutes === "number"
      ? ` Your current estimated wait is about ${Math.max(0, input.estimatedWaitMinutes)} minutes.`
      : "";
    return {
      subject: "Your Luxury Barber Lounge queue update",
      body: `You have been assigned to ${barber}.${wait} Please remain in the lounge and watch the in-shop queue display for your turn.`,
    };
  }
  return {
    subject: "It’s your turn at Luxury Barber Lounge",
    body: `It’s your turn. Please proceed to ${barber} now. If you need assistance, speak with reception.`,
  };
}

async function clientEmail(admin: AdminClient, clientId?: string | null) {
  if (!clientId) return null;
  const { data } = await admin.auth.admin.getUserById(clientId);
  return data.user?.email?.trim() || null;
}

/**
 * Adds a transactional queue update without exposing private queue data.
 * Email is preferred for authenticated clients. SMS is used only when the
 * walk-in explicitly consented and the SMS provider feature is enabled.
 */
export async function enqueueQueueStatusNotification(admin: AdminClient, input: QueueNotificationInput) {
  const email = await clientEmail(admin, input.clientId).catch(() => null);
  const phone = input.clientPhone?.trim() || null;
  const channel = email ? "email" : features.sms && input.smsConsent && phone ? "sms" : null;
  const recipient = channel === "email" ? email : phone;
  if (!channel || !recipient) return { queued: false, reason: "No approved delivery channel." };

  const message = queueMessage(input);
  const idempotencyKey = `queue:${input.entryId}:${input.status}`;
  const { error } = await admin.from("notification_jobs").upsert({
    business_id: input.businessId,
    user_id: input.clientId ?? null,
    channel,
    template_key: `queue_${input.status}`,
    recipient,
    payload: {
      subject: message.subject,
      body: message.body,
      transactional: true,
      smsConsent: Boolean(input.smsConsent),
      queueEntryId: input.entryId,
      status: input.status,
      barberName: input.barberName ?? null,
      estimatedWaitMinutes: input.estimatedWaitMinutes ?? null,
    },
    scheduled_for: new Date().toISOString(),
    status: "queued",
    idempotency_key: idempotencyKey,
  }, { onConflict: "channel,idempotency_key", ignoreDuplicates: true });

  if (error) return { queued: false, reason: error.message };
  return { queued: true, channel };
}
