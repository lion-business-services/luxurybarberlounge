import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const decisions = new Set(["approved", "rejected", "edited", "deferred"]);

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => role === "owner" || role === "super_admin")) return NextResponse.json({ ok: false, message: "Owner access is required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { ruleKey?: string; decision?: string; initials?: string; answer?: string } | null;
  if (!body?.ruleKey || !body.decision || !decisions.has(body.decision)) return NextResponse.json({ ok: false, message: "A valid decision is required." }, { status: 400 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return NextResponse.json({ ok: false, message: "Business configuration was not found." }, { status: 404 });
  const { data: policy } = await admin.from("policy_versions").select("id").eq("business_id", business.id).eq("policy_key", "attribution_commission").eq("version", "1.0").maybeSingle();
  if (!policy?.id) return NextResponse.json({ ok: false, message: "Apply migration 007 before recording policy decisions." }, { status: 409 });

  const { error } = await admin.from("policy_approvals").upsert({
    policy_version_id: policy.id,
    rule_key: body.ruleKey,
    rule_label: body.ruleKey.replaceAll("_", " "),
    rule_state: "proposed",
    owner_decision: body.decision,
    approved_value: body.answer ? { answer: body.answer } : null,
    owner_initials: body.initials?.trim().slice(0, 12) || null,
    decided_by: session.user.id,
    decided_at: new Date().toISOString(),
  }, { onConflict: "policy_version_id,rule_key" });
  if (error) return NextResponse.json({ ok: false, message: "The decision could not be saved." }, { status: 500 });
  await admin.from("audit_logs").insert({ business_id: business.id, actor_user_id: session.user.id, action: "policy_rule_decision", resource_type: "policy_approval", resource_id: body.ruleKey, metadata: { decision: body.decision } });
  return NextResponse.json({ ok: true });
}
