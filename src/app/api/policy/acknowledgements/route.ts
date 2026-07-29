import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const schema = z.object({ policyVersionId: z.string().uuid(), signatureName: z.string().trim().min(2).max(120), acknowledgement: z.literal(true) });
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["barber", "manager", "owner", "super_admin"].includes(role))) return NextResponse.json({ ok: false, message: "Staff access is required." }, { status: 403 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: policies, error } = await admin.from("policy_versions").select("id,policy_key,version,title,effective_from,status,published_at").in("status", ["approved", "published", "owner_review"]).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: "Policies could not be loaded." }, { status: 500 });
  const ids = (policies ?? []).map((item) => item.id);
  const acknowledgements = ids.length ? await admin.from("policy_acknowledgements").select("policy_version_id,acknowledged_at,signature_name").eq("user_id", session.user.id).in("policy_version_id", ids) : { data: [] };
  return NextResponse.json({ ok: true, policies: policies ?? [], acknowledgements: acknowledgements.data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["barber", "manager", "owner", "super_admin"].includes(role))) return NextResponse.json({ ok: false, message: "Staff access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Confirm the policy acknowledgement and signature name." }, { status: 400 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: policy } = await admin.from("policy_versions").select("id,title,version,status").eq("id", parsed.data.policyVersionId).maybeSingle();
  if (!policy || !["approved", "published"].includes(policy.status)) return NextResponse.json({ ok: false, message: "This policy is not yet approved for acknowledgement." }, { status: 409 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  const text = `I acknowledge ${policy.title} version ${policy.version}, understand that it governs operational calculations and disputes, and understand that locked calculations are corrected only by separate Adjustment.`;
  const { error } = await admin.from("policy_acknowledgements").upsert({ policy_version_id: policy.id, user_id: session.user.id, acknowledged_at: new Date().toISOString(), acknowledgement_text: text, signature_name: parsed.data.signatureName, ip_hash: digest(ip), user_agent_hash: digest(agent) }, { onConflict: "policy_version_id,user_id" });
  if (error) return NextResponse.json({ ok: false, message: "The acknowledgement could not be recorded." }, { status: 500 });
  await admin.from("audit_logs").insert({ actor_user_id: session.user.id, action: "policy_acknowledged", resource_type: "policy_version", resource_id: policy.id, metadata: { version: policy.version } });
  return NextResponse.json({ ok: true });
}
