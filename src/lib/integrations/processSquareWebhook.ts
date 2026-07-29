import "server-only";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareRequest, SquareConfigurationError } from "@/lib/square/client";

type AnyRecord = Record<string, unknown>;
type WebhookEventRow = { id: string; business_id: string | null; event_type: string; payload: unknown; attempt_count: number };

function record(value: unknown): AnyRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {}; }
function text(value: unknown) { return typeof value === "string" ? value : null; }
function integer(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0; }
function money(value: unknown) { return integer(record(value).amount); }
function nestedObject(payload: unknown) {
  const data = record(record(payload).data);
  const object = record(data.object);
  return object;
}

async function canonical<T>(path: string, fallback: T): Promise<T> {
  try { return await squareRequest<T>(path); }
  catch (error) { if (error instanceof SquareConfigurationError) return fallback; throw error; }
}

async function businessId(event: WebhookEventRow) {
  if (event.business_id) return event.business_id;
  const admin = createUntypedAdminSupabase();
  if (!admin) return null;
  const { data } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  return typeof data?.id === "string" ? data.id : null;
}

async function syncBooking(event: WebhookEventRow, raw: AnyRecord) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);
  if (!admin || !id || !business) throw new Error("Booking event is missing its business or Square ID.");
  const response = await canonical<{ booking?: AnyRecord }>(`/v2/bookings/${encodeURIComponent(id)}`, { booking: raw });
  const booking = record(response.booking ?? raw);
  const segments = Array.isArray(booking.appointment_segments) ? booking.appointment_segments.map(record) : [];
  const duration = segments.reduce((sum, item) => sum + integer(item.duration_minutes), 0);
  const team = text(segments[0]?.team_member_id);
  const { error } = await admin.from("square_bookings").upsert({ business_id: business, square_id: id, square_customer_id: text(booking.customer_id), square_team_member_id: team, status: text(booking.status), starts_at: text(booking.start_at), duration_minutes: duration || null, version: integer(booking.version) || null, raw: booking, synced_at: new Date().toISOString() }, { onConflict: "business_id,square_id" });
  if (error) throw error;
  const customerId = text(booking.customer_id);
  if (customerId) {
    let recipient: string | null = null;
    const { data: localCustomer } = await admin.from("square_customers").select("email").eq("business_id", business).eq("square_id", customerId).maybeSingle();
    recipient = text(localCustomer?.email);
    if (!recipient) {
      try {
        const customerResponse = await canonical<{ customer?: AnyRecord }>(`/v2/customers/${encodeURIComponent(customerId)}`, {});
        recipient = text(record(customerResponse.customer).email_address);
      } catch {
        recipient = null;
      }
    }
    if (recipient) {
      await admin.from("notification_jobs").upsert({ business_id: business, user_id: null, channel: "email", template_key: event.event_type === "booking.created" ? "booking_confirmation" : "booking_update", recipient, payload: { square_booking_id: id, event_type: event.event_type }, scheduled_for: new Date().toISOString(), status: "queued", idempotency_key: `square:${event.id}:booking-notification` }, { onConflict: "channel,idempotency_key" });
    }
  }
  return { resource: "booking", squareId: id };
}

async function syncPayment(event: WebhookEventRow, raw: AnyRecord) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);
  if (!admin || !id || !business) throw new Error("Payment event is missing its business or Square ID.");
  const response = await canonical<{ payment?: AnyRecord }>(`/v2/payments/${encodeURIComponent(id)}`, { payment: raw });
  const payment = record(response.payment ?? raw);
  const card = record(record(payment.card_details).card);
  const processing = Array.isArray(payment.processing_fee) ? payment.processing_fee.map(record).reduce((sum, fee) => sum + money(fee.amount_money), 0) : 0;
  const { error } = await admin.from("square_payments").upsert({ business_id: business, square_id: id, square_order_id: text(payment.order_id), square_customer_id: text(payment.customer_id), status: text(payment.status), amount_cents: money(payment.amount_money), tip_cents: money(payment.tip_money), processing_fee_cents: processing, card_brand: text(card.card_brand), created_at_square: text(payment.created_at), raw: payment, synced_at: new Date().toISOString() }, { onConflict: "business_id,square_id" });
  if (error) throw error;
  return { resource: "payment", squareId: id };
}

async function syncRefund(event: WebhookEventRow, raw: AnyRecord) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);
  if (!admin || !id || !business) throw new Error("Refund event is missing its business or Square ID.");
  const response = await canonical<{ refund?: AnyRecord }>(`/v2/refunds/${encodeURIComponent(id)}`, { refund: raw });
  const refund = record(response.refund ?? raw);
  const { error } = await admin.from("square_refunds").upsert({ business_id: business, square_id: id, square_payment_id: text(refund.payment_id) ?? "unknown", status: text(refund.status), amount_cents: money(refund.amount_money), reason: text(refund.reason), raw: refund, synced_at: new Date().toISOString() }, { onConflict: "business_id,square_id" });
  if (error) throw error;
  return { resource: "refund", squareId: id };
}

async function syncOrder(event: WebhookEventRow, raw: AnyRecord) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);
  if (!admin || !id || !business) throw new Error("Order event is missing its business or Square ID.");
  const response = await canonical<{ order?: AnyRecord }>(`/v2/orders/${encodeURIComponent(id)}`, { order: raw });
  const order = record(response.order ?? raw);
  const { error } = await admin.from("square_orders").upsert({ business_id: business, square_id: id, location_square_id: text(order.location_id), customer_square_id: text(order.customer_id), state: text(order.state), total_cents: money(order.total_money), tax_cents: money(order.total_tax_money), discount_cents: money(order.total_discount_money), raw: order, synced_at: new Date().toISOString() }, { onConflict: "business_id,square_id" });
  if (error) throw error;
  return { resource: "order", squareId: id };
}

async function syncCustomer(event: WebhookEventRow, raw: AnyRecord) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);
  if (!admin || !id || !business) throw new Error("Customer event is missing its business or Square ID.");
  const response = await canonical<{ customer?: AnyRecord }>(`/v2/customers/${encodeURIComponent(id)}`, { customer: raw });
  const customer = record(response.customer ?? raw);
  const displayName = [text(customer.given_name), text(customer.family_name)].filter(Boolean).join(" ") || text(customer.company_name);
  const { error } = await admin.from("square_customers").upsert({ business_id: business, square_id: id, email: text(customer.email_address), phone: text(customer.phone_number), display_name: displayName || null, raw: customer, synced_at: new Date().toISOString() }, { onConflict: "business_id,square_id" });
  if (error) throw error;
  return { resource: "customer", squareId: id };
}

export async function processSquareWebhookEvent(event: WebhookEventRow) {
  const object = nestedObject(event.payload);
  if (event.event_type.startsWith("booking.")) return syncBooking(event, record(object.booking));
  if (event.event_type.startsWith("payment.")) return syncPayment(event, record(object.payment));
  if (event.event_type.startsWith("refund.")) return syncRefund(event, record(object.refund));
  if (event.event_type.startsWith("order.")) return syncOrder(event, record(object.order));
  if (event.event_type.startsWith("customer.")) return syncCustomer(event, record(object.customer));
  return { resource: "ignored", reason: "No canonical sync handler is required for this event type." };
}

export async function processWebhookInbox(limit = 25) {
  const admin = createUntypedAdminSupabase();
  if (!admin) return { processed: 0, failed: 0, ignored: 0, configured: false };
  const { data: rows, error } = await admin.from("webhook_events").select("id,business_id,event_type,payload,attempt_count").in("processing_status", ["received", "retrying"]).order("received_at", { ascending: true }).limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;
  let processed = 0, failed = 0, ignored = 0;
  for (const row of rows ?? []) {
    const event = row as WebhookEventRow;
    const attempt = (event.attempt_count ?? 0) + 1;
    const started = new Date().toISOString();
    await admin.from("webhook_events").update({ processing_status: "processing", attempt_count: attempt, last_error: null }).eq("id", event.id).in("processing_status", ["received", "retrying"]);
    const { data: attemptRow } = await admin.from("webhook_attempts").insert({ webhook_event_id: event.id, attempt, status: "processing", started_at: started }).select("id").single();
    try {
      const result = await processSquareWebhookEvent(event);
      const isIgnored = result.resource === "ignored";
      await admin.from("webhook_events").update({ processing_status: isIgnored ? "ignored" : "processed", processed_at: new Date().toISOString(), last_error: null }).eq("id", event.id);
      if (attemptRow?.id) await admin.from("webhook_attempts").update({ status: isIgnored ? "ignored" : "processed", completed_at: new Date().toISOString(), result }).eq("id", attemptRow.id);
      if (isIgnored) ignored += 1; else processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown webhook processing error";
      const dead = attempt >= 5;
      await admin.from("webhook_events").update({ processing_status: dead ? "dead_letter" : "failed", last_error: message }).eq("id", event.id);
      if (attemptRow?.id) await admin.from("webhook_attempts").update({ status: "failed", completed_at: new Date().toISOString(), error_message: message }).eq("id", attemptRow.id);
      failed += 1;
    }
  }
  return { processed, failed, ignored, configured: true };
}
