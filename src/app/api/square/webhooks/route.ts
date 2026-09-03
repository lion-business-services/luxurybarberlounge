import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifySquareWebhook } from "@/lib/square/webhooks";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-square-hmacsha256-signature");
  if (!verifySquareWebhook({ rawBody, signatureHeader })) {
    return NextResponse.json({ message: "Invalid webhook signature." }, { status: 401 });
  }
  let event: { event_id?: string; type?: string; merchant_id?: string; data?: Json };
  try { event = JSON.parse(rawBody) as typeof event; }
  catch { return NextResponse.json({ message: "Malformed webhook JSON." }, { status: 400 }); }
  if (!event.event_id || !event.type) return NextResponse.json({ message: "Malformed webhook event." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ accepted: true, mode: "credential-pending" }, { status: 202 });

  const { data: existing } = await admin.from("webhook_events").select("id,processing_status").eq("provider", "square").eq("provider_event_id", event.event_id).maybeSingle();
  if (existing) return NextResponse.json({ accepted: true, duplicate: true });

  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();

  const { data: inserted, error } = await admin.from("webhook_events").insert({
    business_id: business?.id ?? null,
    provider: "square",
    provider_event_id: event.event_id,
    event_type: event.type,
    signature_valid: true,
    payload: { merchant_id: event.merchant_id ?? null, data: event.data ?? null },
    sanitized_headers: { content_type: request.headers.get("content-type") },
    processing_status: "received",
  }).select("*").maybeSingle();
  if (error) return NextResponse.json({ message: "Webhook inbox is unavailable." }, { status: 503 });

  // Process immediately rather than waiting for the retry cron. Payment events
  // reconcile the walk-in ledger and commission statements in the same cycle,
  // while the cron remains a recovery net for transient failures.
  if (inserted) {
    try {
      const { processSquareWebhookEventSafely } = await import("@/lib/integrations/squareWebhookSafeProcessor");
      await processSquareWebhookEventSafely(inserted);

      if (business?.id && event.type.startsWith("payment.")) {
        try {
          const [{ createUntypedAdminSupabase }, { reconcilePendingWalkInSquarePayments }] = await Promise.all([
            import("@/lib/auth/server"),
            import("@/lib/queue/payments"),
          ]);
          const untypedAdmin = createUntypedAdminSupabase();
          if (untypedAdmin) await reconcilePendingWalkInSquarePayments(untypedAdmin, String(business.id));
        } catch (walkInError) {
          console.error("walk-in-square-reconciliation", walkInError);
        }

        try {
          const { reconcileCommissions } = await import("@/lib/commissions/reconcile");
          await reconcileCommissions(100);
        } catch (commissionError) {
          console.error("payment-commission-reconciliation", commissionError);
        }
      }

      await admin.from("webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), last_error: null }).eq("id", inserted.id);
    } catch (processingError) {
      // Leave a recoverable failure for the retry worker. It selects failed
      // events as well as received/retrying events until the five-attempt cap.
      await admin.from("webhook_events").update({ processing_status: "failed", last_error: String(processingError).slice(0, 500) }).eq("id", inserted.id);
    }
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}