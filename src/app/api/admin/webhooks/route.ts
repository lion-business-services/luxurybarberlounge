import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { processWebhookInbox } from "@/lib/integrations/processSquareWebhook";

async function authorized() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["manager", "owner", "super_admin"].includes(role))) return null;
  const admin = createUntypedAdminSupabase();
  return { session, admin };
}

export async function GET() {
  const context = await authorized();
  if (!context) return NextResponse.json({ ok: false, message: "Manager access is required." }, { status: 403 });
  if (!context.admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await context.admin.from("webhook_events").select("id,provider,provider_event_id,event_type,signature_valid,received_at,processing_status,processed_at,attempt_count,last_error").order("received_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ ok: false, message: "Webhook events could not be loaded." }, { status: 500 });
  return NextResponse.json({ ok: true, events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await authorized();
  if (!context) return NextResponse.json({ ok: false, message: "Manager access is required." }, { status: 403 });
  if (!context.admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { action?: string; eventId?: string } | null;
  if (body?.action === "process") return NextResponse.json({ ok: true, ...(await processWebhookInbox(25)) });
  if (body?.action !== "retry" || !z.string().uuid().safeParse(body.eventId).success) return NextResponse.json({ ok: false, message: "A valid action is required." }, { status: 400 });
  const { error } = await context.admin.from("webhook_events").update({ processing_status: "retrying", last_error: null }).eq("id", body.eventId).in("processing_status", ["failed", "dead_letter", "ignored"]);
  if (error) return NextResponse.json({ ok: false, message: "The event could not be queued for retry." }, { status: 500 });
  await context.admin.from("audit_logs").insert({ actor_user_id: context.session.user.id, action: "webhook_retry_requested", resource_type: "webhook_event", resource_id: body.eventId, metadata: {} });
  return NextResponse.json({ ok: true });
}
