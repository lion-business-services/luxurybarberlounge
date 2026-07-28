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
  const event = JSON.parse(rawBody) as { event_id?: string; type?: string; merchant_id?: string; data?: Json };
  if (!event.event_id || !event.type) return NextResponse.json({ message: "Malformed webhook event." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ accepted: true, mode: "credential-pending" }, { status: 202 });

  const { data: existing } = await admin.from("webhook_events").select("id,processing_status").eq("provider", "square").eq("provider_event_id", event.event_id).maybeSingle();
  if (existing) return NextResponse.json({ accepted: true, duplicate: true });

  const { error } = await admin.from("webhook_events").insert({
    provider: "square",
    provider_event_id: event.event_id,
    event_type: event.type,
    signature_valid: true,
    payload: { merchant_id: event.merchant_id ?? null, data: event.data ?? null },
    sanitized_headers: { content_type: request.headers.get("content-type") },
    processing_status: "received",
  });
  if (error) return NextResponse.json({ message: "Webhook inbox is unavailable." }, { status: 503 });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
