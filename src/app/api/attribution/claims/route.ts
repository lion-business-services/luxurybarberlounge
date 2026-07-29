import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const claimTypes = new Set(["pre_existing","personal_referral","referral_code","approved_lead","roster","late_claim"]);
const evidenceTypes = new Set(["appointment_record","pos_record","booking_export","client_list","message_history","client_confirmation","other"]);

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["barber","manager","owner","super_admin"].includes(role))) return NextResponse.json({ ok: false }, { status: 403 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, live: false, claims: [] });
  let query = admin.from("attribution_claims").select("id,barber_user_id,client_email,client_phone,claim_type,status,explanation,criteria,requested_at,policy_version").order("requested_at", { ascending: false }).limit(100);
  if (session.roles.includes("barber") && !session.roles.some((role) => ["manager","owner","super_admin"].includes(role))) query = query.eq("barber_user_id", session.user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, message: "Claims could not be loaded." }, { status: 503 });
  return NextResponse.json({ ok: true, live: true, claims: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.includes("barber")) return NextResponse.json({ ok: false, message: "Barber access is required." }, { status: 403 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const form = await request.formData();
  const claimType = String(form.get("claimType") ?? "");
  const evidenceType = String(form.get("evidenceType") ?? "");
  const explanation = String(form.get("explanation") ?? "").trim().slice(0, 3000);
  const clientEmail = String(form.get("clientEmail") ?? "").trim().toLowerCase().slice(0, 254) || null;
  const clientPhone = String(form.get("clientPhone") ?? "").trim().slice(0, 40) || null;
  const priorServiceDate = String(form.get("priorServiceDate") ?? "").slice(0, 10) || null;
  const priorPlace = String(form.get("priorPlace") ?? "").trim().slice(0, 240) || null;
  const file = form.get("evidence");
  if (!claimTypes.has(claimType) || explanation.length < 20 || (!clientEmail && !clientPhone)) return NextResponse.json({ ok: false, message: "Claim type, client contact, and a complete explanation are required." }, { status: 422 });
  const { data: staff } = await admin.from("staff_profiles").select("business_id").eq("user_id", session.user.id).maybeSingle();
  if (!staff?.business_id) return NextResponse.json({ ok: false, message: "Barber profile is not connected to the business." }, { status: 409 });
  const { data: claim, error } = await admin.from("attribution_claims").insert({ business_id: staff.business_id, barber_user_id: session.user.id, client_email: clientEmail, client_phone: clientPhone, claim_type: claimType, status: "submitted", explanation, criteria: { priorServiceDate, priorPlace, policyLookbackMonths: 24 }, policy_version: "1.0", submitted_before_service: form.get("submittedBeforeService") === "true" }).select("id").single();
  if (error || !claim?.id) return NextResponse.json({ ok: false, message: "The claim could not be created." }, { status: 500 });

  if (file instanceof File && file.size > 0) {
    if (!evidenceTypes.has(evidenceType) || file.size > 10 * 1024 * 1024 || !["image/jpeg","image/png","image/webp","application/pdf","text/plain"].includes(file.type)) return NextResponse.json({ ok: false, message: "The claim was created, but the evidence file type or size was not accepted.", claimId: claim.id }, { status: 422 });
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const path = `attribution/${session.user.id}/${claim.id}/${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const upload = await admin.storage.from("dispute-evidence").upload(path, bytes, { contentType: file.type, upsert: false });
    if (!upload.error) await admin.from("attribution_evidence").insert({ claim_id: claim.id, evidence_type: evidenceType, storage_path: path, evidence_date: priorServiceDate, description: file.name.slice(0, 240), submitted_by: session.user.id, status: "submitted" });
  }
  await admin.from("audit_logs").insert({ business_id: staff.business_id, actor_user_id: session.user.id, action: "attribution_claim_submitted", resource_type: "attribution_claim", resource_id: claim.id, metadata: { claimType } });
  return NextResponse.json({ ok: true, claimId: claim.id }, { status: 201 });
}
