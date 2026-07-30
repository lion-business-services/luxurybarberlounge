import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUserServerSupabase, getServerAuthSession } from "@/lib/auth/server";

const requestSchema = z.object({
  membershipId: z.string().uuid().nullable().optional(),
  requestType: z.enum(["activate", "upgrade", "downgrade", "pause", "resume", "cancel"]),
  reason: z.string().trim().max(1000).optional(),
});

async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.accessToken || !session.roles.includes("client")) return null;
  const supabase = createUserServerSupabase(session.accessToken);
  return supabase ? { session, supabase } : null;
}

export async function GET() {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const { data, error } = await value.supabase.from("membership_requests").select("id,request_type,status,reason,created_at,reviewed_at").eq("client_user_id", value.session.user.id).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ ok: false, message: "Membership requests could not be loaded." }, { status: 500 });
  return NextResponse.json({ ok: true, requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const value = await context();
  if (!value) return NextResponse.json({ ok: false, message: "Client access is required." }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Select a valid membership request." }, { status: 400 });
  const { data: client } = await value.supabase.from("client_profiles").select("business_id").eq("user_id", value.session.user.id).maybeSingle();
  if (!client?.business_id) return NextResponse.json({ ok: false, message: "Your client profile is not connected to the lounge." }, { status: 409 });
  if (parsed.data.membershipId) {
    const { data: membership } = await value.supabase.from("memberships").select("id").eq("id", parsed.data.membershipId).eq("client_user_id", value.session.user.id).maybeSingle();
    if (!membership?.id) return NextResponse.json({ ok: false, message: "The membership is not available to this account." }, { status: 404 });
  }
  const { data: existing } = await value.supabase.from("membership_requests").select("id,status").eq("client_user_id", value.session.user.id).eq("request_type", parsed.data.requestType).in("status", ["submitted", "in_review", "provider_pending"]).limit(1).maybeSingle();
  if (existing?.id) return NextResponse.json({ ok: true, duplicate: true, requestId: existing.id });
  const { data, error } = await value.supabase.from("membership_requests").insert({
    business_id: client.business_id,
    client_user_id: value.session.user.id,
    membership_id: parsed.data.membershipId ?? null,
    request_type: parsed.data.requestType,
    reason: parsed.data.reason ?? null,
  }).select("id").single();
  if (error || !data?.id) return NextResponse.json({ ok: false, message: "The membership request could not be recorded." }, { status: 500 });
  return NextResponse.json({ ok: true, requestId: data.id });
}
