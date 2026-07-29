import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["manager","owner","super_admin"].includes(role))) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => null) as { claimId?: string; decision?: string; reason?: string } | null;
  if (!body?.claimId || !["approved","rejected","needs_information"].includes(body.decision ?? "") || (body.reason?.trim().length ?? 0) < 8) return NextResponse.json({ ok: false, message: "Claim, decision, and a written reason are required." }, { status: 422 });
  const decisionReason = body.reason!.trim().slice(0, 3000);
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data: claim } = await admin.from("attribution_claims").select("id,business_id,barber_user_id,client_user_id,client_email,client_phone").eq("id", body.claimId).maybeSingle();
  if (!claim) return NextResponse.json({ ok: false, message: "Claim not found." }, { status: 404 });
  const { data: rule } = await admin.from("attribution_rule_versions").select("id").lte("effective_from", new Date().toISOString()).or(`effective_to.is.null,effective_to.gt.${new Date().toISOString()}`).order("priority", { ascending: true }).limit(1).maybeSingle();
  const { error } = await admin.from("attribution_decisions").insert({ claim_id: claim.id, decision: body.decision, reason: decisionReason, decided_by: session.user.id, effective_from: body.decision === "approved" ? new Date().toISOString() : null, rule_version_id: rule?.id ?? null });
  if (error) return NextResponse.json({ ok: false, message: "The decision could not be saved." }, { status: 500 });
  await admin.from("attribution_claims").update({ status: body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : "needs_information" }).eq("id", claim.id);
  if (body.decision === "approved") {
    const external = claim.client_user_id ? null : String(claim.client_email || claim.client_phone || claim.id);
    await admin.from("client_barber_attributions").upsert({ business_id: claim.business_id, client_user_id: claim.client_user_id, client_external_ref: external, barber_user_id: claim.barber_user_id, attribution: "BARBER", source: "approved_attribution_claim", claim_id: claim.id, evidence_summary: { decisionReason }, rule_version_id: rule?.id ?? null, effective_from: new Date().toISOString(), created_by: session.user.id }, { onConflict: claim.client_user_id ? "business_id,client_user_id,barber_user_id" : "business_id,client_external_ref,barber_user_id" });
  }
  await admin.from("audit_logs").insert({ business_id: claim.business_id, actor_user_id: session.user.id, action: "attribution_claim_decision", resource_type: "attribution_claim", resource_id: claim.id, metadata: { decision: body.decision, reason: decisionReason } });
  return NextResponse.json({ ok: true });
}
