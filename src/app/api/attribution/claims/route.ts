import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { addDays, dateInZone, weekdayForDate, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";

const claimTypes = new Set(["pre_existing","personal_referral","referral_code","approved_lead","roster","late_claim"]);
const evidenceTypes = new Set(["appointment_record","pos_record","booking_export","client_list","message_history","client_confirmation","other"]);

type AdminClient = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;
type ClaimRow = {
  id: string;
  barber_user_id: string;
  client_email?: string | null;
  client_phone?: string | null;
  claim_type: string;
  status: string;
  requested_at: string;
};

async function loadIntegrityFlags(admin: AdminClient, businessId: string, claims: ClaimRow[]) {
  const localDate = dateInZone(new Date(), businessConfig.timezone);
  const weekday = weekdayForDate(localDate);
  const daysBack = weekday === 0 ? 6 : weekday - 1;
  const monday = addDays(localDate, -daysBack);
  const startsAt = zonedDateTimeToUtc(monday, "00:00:00", businessConfig.timezone).toISOString();
  const recentClaims = claims.filter((claim) => claim.claim_type === "pre_existing" && String(claim.requested_at ?? "") >= startsAt && claim.status !== "withdrawn");
  const barberIds = [...new Set(recentClaims.map((claim) => String(claim.barber_user_id)).filter(Boolean))];
  if (!barberIds.length) return [];

  const [{ data: profiles }, { data: appointments }] = await Promise.all([
    admin.from("barber_profiles").select("staff_user_id,display_name").eq("business_id", businessId).in("staff_user_id", barberIds),
    admin.from("appointments").select("assigned_staff_user_id,client_id,starts_at,status").eq("business_id", businessId).in("assigned_staff_user_id", barberIds).gte("starts_at", startsAt).not("status", "in", "(cancelled_by_client,cancelled_by_business,declined,expired,failed)"),
  ]);
  const nameByBarber = new Map((profiles ?? []).map((profile) => [String(profile.staff_user_id), String(profile.display_name ?? "Barber")]));
  const allClientIds = [...new Set((appointments ?? []).map((appointment) => String(appointment.client_id ?? "")).filter(Boolean))];
  const { data: clientRows } = allClientIds.length
    ? await admin.from("clients").select("id,created_at").eq("business_id", businessId).in("id", allClientIds)
    : { data: [] };
  const createdAtByClient = new Map((clientRows ?? []).map((client) => [String(client.id), String(client.created_at ?? "")]));

  return barberIds.flatMap((barberUserId) => {
    const claimsForBarber = recentClaims.filter((claim) => String(claim.barber_user_id) === barberUserId);
    const uniqueClaims = new Set(claimsForBarber.map((claim) => String(claim.client_email ?? claim.client_phone ?? claim.id))).size;
    const newClientIds = new Set(
      (appointments ?? [])
        .filter((appointment) => String(appointment.assigned_staff_user_id) === barberUserId)
        .map((appointment) => String(appointment.client_id ?? ""))
        .filter((clientId: string) => clientId && (createdAtByClient.get(clientId) ?? "") >= startsAt),
    );
    const newClients = newClientIds.size;
    const ratio = newClients > 0 ? uniqueClaims / newClients : uniqueClaims > 0 ? 1 : 0;
    if (ratio <= 0.4) return [];
    return [{
      barberUserId,
      barberName: nameByBarber.get(barberUserId) ?? "Barber",
      preExistingClaims: uniqueClaims,
      newClients,
      ratio,
      threshold: 0.4,
      settlementWeekStart: monday,
    }];
  });
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => ["barber","manager","owner","super_admin"].includes(role))) return NextResponse.json({ ok: false }, { status: 403 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, live: false, claims: [] });
  let query = admin.from("attribution_claims").select("id,business_id,barber_user_id,client_email,client_phone,claim_type,status,explanation,criteria,requested_at,policy_version").order("requested_at", { ascending: false }).limit(100);
  const administrative = session.roles.some((role) => ["manager","owner","super_admin"].includes(role));
  if (session.roles.includes("barber") && !administrative) query = query.eq("barber_user_id", session.user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, message: "Claims could not be loaded." }, { status: 503 });
  let integrityFlags: Awaited<ReturnType<typeof loadIntegrityFlags>> = [];
  if (administrative) {
    const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
    if (business?.id) integrityFlags = await loadIntegrityFlags(admin, String(business.id), data ?? []);
  }
  // Supply the barber's real clients so a claim is chosen from a list rather
  // than typed from memory. Clients who declared themselves NEW are returned
  // with claimable:false so the UI can disable them and state why - the
  // database trigger still refuses them regardless of what the UI does.
  let claimableClients: Array<{
    clientId: string; name: string; email: string | null; phone: string | null;
    lastVisit: string | null; declaredStatus: string | null; claimable: boolean; reason: string | null;
    barberName: string | null;
  }> = [];
  try {
    const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
    if (business?.id) {
      // A supervisor/test identity may review every barber's clients.
      const { data: me } = await admin
        .from("barber_profiles")
        .select("can_claim_for_any_barber,staff_user_id")
        .eq("staff_user_id", session.user.id)
        .eq("business_id", business.id)
        .maybeSingle();
      const seesEveryone = administrative || me?.can_claim_for_any_barber === true;

      let apptQuery = admin
        .from("appointments")
        .select("client_id,client_name_snapshot,client_email_snapshot,client_phone_snapshot,starts_at,client_declared_status,assigned_staff_user_id,barber_name_snapshot,status")
        .eq("business_id", business.id)
        .not("status", "in", "(cancelled_by_client,cancelled_by_business,declined,expired,failed)")
        .order("starts_at", { ascending: false })
        .limit(200);
      if (!seesEveryone) apptQuery = apptQuery.eq("assigned_staff_user_id", session.user.id);
      const { data: appts } = await apptQuery;

      const seen = new Set<string>();
      claimableClients = (appts ?? []).flatMap((a) => {
        const key = String(a.client_id ?? a.client_email_snapshot ?? "");
        if (!key || seen.has(key)) return [];
        seen.add(key);
        const isNew = a.client_declared_status === "new";
        return [{
          clientId: String(a.client_id ?? ""),
          name: String(a.client_name_snapshot ?? "Client"),
          email: a.client_email_snapshot ? String(a.client_email_snapshot) : null,
          phone: a.client_phone_snapshot ? String(a.client_phone_snapshot) : null,
          lastVisit: a.starts_at ? String(a.starts_at) : null,
          declaredStatus: a.client_declared_status ? String(a.client_declared_status) : null,
          claimable: !isNew,
          reason: isNew ? "Declared themselves a NEW client at booking - shop-generated, cannot be claimed." : null,
          barberName: a.barber_name_snapshot ? String(a.barber_name_snapshot) : null,
        }];
      });
    }
  } catch {
    claimableClients = [];
  }

  return NextResponse.json({ ok: true, live: true, claims: data ?? [], integrityFlags, claimableClients });
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

  // A designated test/supervisor identity may file a claim on behalf of another
  // barber, so the claim rules can be exercised without logging in as each one.
  // The NEW-client block still applies - that rule is never bypassable.
  let claimBarberUserId = session.user.id;
  const onBehalfOf = String(form.get("onBehalfOfBarberProfileId") ?? "").trim();
  if (onBehalfOf) {
    const { data: me } = await admin
      .from("barber_profiles")
      .select("can_claim_for_any_barber")
      .eq("staff_user_id", session.user.id)
      .eq("business_id", staff.business_id)
      .maybeSingle();
    if (!me?.can_claim_for_any_barber) {
      return NextResponse.json({ ok: false, message: "You may only submit claims for your own clients." }, { status: 403 });
    }
    const { data: target } = await admin
      .from("barber_profiles")
      .select("staff_user_id")
      .eq("id", onBehalfOf)
      .eq("business_id", staff.business_id)
      .maybeSingle();
    if (!target?.staff_user_id) {
      return NextResponse.json({ ok: false, message: "That barber has no portal identity to file a claim against." }, { status: 409 });
    }
    claimBarberUserId = String(target.staff_user_id);
  }

  const { data: claim, error } = await admin.from("attribution_claims").insert({ business_id: staff.business_id, barber_user_id: claimBarberUserId, client_email: clientEmail, client_phone: clientPhone, claim_type: claimType, status: "submitted", explanation, criteria: { priorServiceDate, priorPlace, policyLookbackMonths: 24 }, policy_version: "1.0", submitted_before_service: form.get("submittedBeforeService") === "true" }).select("id").single();
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
