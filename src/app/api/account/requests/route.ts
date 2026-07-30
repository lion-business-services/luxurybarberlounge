import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUserServerSupabase, createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const schema = z.object({ type: z.enum(["data_export", "account_deletion"]), note: z.string().trim().max(1000).optional() });
const requestType = { data_export: "export", account_deletion: "deletion" } as const;

async function clientContext() {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.includes("client")) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  return supabase ? { session, supabase } : null;
}

export async function GET() {
  const context = await clientContext();
  if (!context) return NextResponse.json({ ok: false, message: "Client authentication is required." }, { status: 401 });
  const { data, error } = await context.supabase.from("privacy_requests").select("id,request_type,status,details,created_at,completed_at").eq("user_id", context.session.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: "Privacy requests could not be loaded." }, { status: 500 });
  return NextResponse.json({ ok: true, requests: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await clientContext();
  if (!context) return NextResponse.json({ ok: false, message: "Client authentication is required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Select a valid privacy request." }, { status: 400 });
  const canonicalType = requestType[parsed.data.type];
  const { data: client } = await context.supabase.from("client_profiles").select("business_id").eq("user_id", context.session.user.id).maybeSingle();
  const { data: existing } = await context.supabase.from("privacy_requests").select("id,status").eq("user_id", context.session.user.id).eq("request_type", canonicalType).in("status", ["submitted", "identity_verified", "in_review"]).limit(1).maybeSingle();
  if (existing?.id) return NextResponse.json({ ok: true, duplicate: true, requestId: existing.id });

  const { data, error } = await context.supabase.from("privacy_requests").insert({
    business_id: client?.business_id ?? null,
    user_id: context.session.user.id,
    request_type: canonicalType,
    details: { note: parsed.data.note ?? null, source: "client_portal" },
  }).select("id").single();
  if (error || !data?.id) return NextResponse.json({ ok: false, message: "The request could not be recorded." }, { status: 500 });

  const admin = createUntypedAdminSupabase();
  if (admin) {
    await admin.from("audit_logs").insert({
      business_id: client?.business_id ?? null,
      actor_user_id: context.session.user.id,
      actor_role: "client",
      action: "privacy_request_submitted",
      resource_type: "privacy_request",
      resource_id: data.id,
      metadata: { request_type: canonicalType },
    });
  }
  return NextResponse.json({ ok: true, requestId: data.id });
}
