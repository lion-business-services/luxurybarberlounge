import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { processSquareWebhookEvent } from "@/lib/integrations/processSquareWebhook";

type WebhookEventRow = {
  id: string;
  business_id: string | null;
  event_type: string;
  payload: unknown;
  attempt_count: number;
};

type AnyRecord = Record<string, unknown>;

const paymentStatusContext = new AsyncLocalStorage<string>();
const globalRecord = globalThis as typeof globalThis & { status?: string };

function record(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as AnyRecord
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

/*
 * Compatibility protection for the legacy Square webhook processor.
 *
 * Its membership-activation branch references the browser-style global
 * `status` identifier after already calculating the canonical payment status.
 * Node has no such global by default, so payment webhooks can throw after the
 * payment itself has already synced. Defining a getter backed by
 * AsyncLocalStorage keeps that legacy read request-scoped and concurrency-safe.
 *
 * This wrapper is intentionally isolated so the compatibility shim can be
 * removed cleanly when the legacy processor is refactored.
 */
if (!Object.getOwnPropertyDescriptor(globalThis, "status")) {
  Object.defineProperty(globalThis, "status", {
    configurable: true,
    enumerable: false,
    get() {
      return paymentStatusContext.getStore() ?? "";
    },
  });
}

function paymentStatusFromEvent(event: WebhookEventRow) {
  if (!event.event_type.startsWith("payment.")) return "";
  const payload = record(event.payload);
  const data = record(payload.data);
  const object = record(data.object);
  const payment = record(object.payment);
  return text(payment.status) ?? "";
}

export async function processSquareWebhookEventSafely(event: WebhookEventRow) {
  const status = paymentStatusFromEvent(event);
  return paymentStatusContext.run(status, () => processSquareWebhookEvent(event));
}

export async function processWebhookInboxSafely(limit = 25) {
  const admin = createUntypedAdminSupabase();
  if (!admin) {
    return { processed: 0, failed: 0, ignored: 0, configured: false };
  }

  const { data: rows, error } = await admin
    .from("webhook_events")
    .select("id,business_id,event_type,payload,attempt_count,processing_status")
    .in("processing_status", ["received", "retrying", "failed"])
    .lt("attempt_count", 5)
    .order("received_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error) throw error;

  let processed = 0;
  let failed = 0;
  let ignored = 0;

  for (const row of rows ?? []) {
    const event = row as WebhookEventRow & { processing_status?: string };
    const attempt = Number(event.attempt_count ?? 0) + 1;
    const eligibleStatuses = ["received", "retrying", "failed"];
    const startedAt = new Date().toISOString();

    const { data: claimed, error: claimError } = await admin
      .from("webhook_events")
      .update({
        processing_status: "processing",
        attempt_count: attempt,
        last_error: null,
      })
      .eq("id", event.id)
      .in("processing_status", eligibleStatuses)
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed?.id) continue;

    const { data: attemptRow } = await admin
      .from("webhook_attempts")
      .insert({
        webhook_event_id: event.id,
        attempt,
        status: "processing",
        started_at: startedAt,
      })
      .select("id")
      .single();

    try {
      const result = await processSquareWebhookEventSafely(event);
      const isIgnored = result.resource === "ignored";
      const completedAt = new Date().toISOString();

      await admin
        .from("webhook_events")
        .update({
          processing_status: isIgnored ? "ignored" : "processed",
          processed_at: completedAt,
          last_error: null,
        })
        .eq("id", event.id);

      if (attemptRow?.id) {
        await admin
          .from("webhook_attempts")
          .update({
            status: isIgnored ? "ignored" : "processed",
            completed_at: completedAt,
            result,
            error_message: null,
          })
          .eq("id", attemptRow.id);
      }

      if (isIgnored) ignored += 1;
      else processed += 1;
    } catch (processingError) {
      const message = processingError instanceof Error
        ? processingError.message.slice(0, 1000)
        : "Unknown webhook processing error";
      const dead = attempt >= 5;
      const completedAt = new Date().toISOString();

      await admin
        .from("webhook_events")
        .update({
          processing_status: dead ? "dead_letter" : "failed",
          last_error: message,
        })
        .eq("id", event.id);

      if (attemptRow?.id) {
        await admin
          .from("webhook_attempts")
          .update({
            status: "failed",
            completed_at: completedAt,
            error_message: message,
          })
          .eq("id", attemptRow.id);
      }

      failed += 1;
    }
  }

  return { processed, failed, ignored, configured: true };
}
