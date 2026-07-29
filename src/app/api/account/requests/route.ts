import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const schema = z.object({ type: z.enum(["data_export", "account_deletion"]), note: z.string().trim().max(1000).optional() });

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user) return NextResponse.json({ ok: false, message: "Authentication is required." }, { status: 401 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await admin.from("support_cases").select("id,case_number,category,status,subject,created_at,resolved_at").eq("client_user_id", session.user.id).in("category", ["data_export", "account_deletion"]).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: "Privacy requests could not be loaded." }, { status: 500 });
  return NextResponse.json({ ok: true, requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user) return NextResponse.json({ ok: false, message: "Authentication is required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Select a valid privacy request." }, { status: 400 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration was not found." }, { status: 404 });
  const existing = await admin.from("support_cases").select("id,case_number").eq("business_id", business.id).eq("client_user_id", session.user.id).eq("category", parsed.data.type).in("status", ["open", "pending_client", "pending_internal"]).maybeSingle();
  if (existing.data?.id) return NextResponse.json({ ok: true, duplicate: true, caseNumber: existing.data.case_number });
  const caseNumber = `PRIV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const subject = parsed.data.type === "data_export" ? "Client data export request" : "Client account deletion request";
  const { data, error } = await admin.from("support_cases").insert({ business_id: business.id, client_user_id: session.user.id, case_number: caseNumber, category: parsed.data.type, priority: "normal", status: "open", subject, description: parsed.data.note || "Submitted through the authenticated client portal." }).select("id").single();
  if (error || !data?.id) return NextResponse.json({ ok: false, message: "The request could not be recorded." }, { status: 500 });
  await admin.from("support_case_events").insert({ case_id: data.id, actor_user_id: session.user.id, client_visible: true, event_type: "request_submitted", message: "Privacy request submitted and awaiting authorized review.", metadata: { request_type: parsed.data.type } });
  await admin.from("audit_logs").insert({ business_id: business.id, actor_user_id: session.user.id, action: "privacy_request_submitted", resource_type: "support_case", resource_id: data.id, metadata: { request_type: parsed.data.type } });
  return NextResponse.json({ ok: true, caseNumber });
}
