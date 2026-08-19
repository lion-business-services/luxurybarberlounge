import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { reconcileCommissions } from "@/lib/commissions/reconcile";

const adminRoles = new Set(["manager", "owner", "super_admin"]);

export async function GET() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => role === "barber" || adminRoles.has(role))) return NextResponse.json({ ok: false }, { status: 403 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, live: false, statements: [], calculations: [], disputes: [] });
  const administrative = session.roles.some((role) => adminRoles.has(role));
  let statements = admin.from("settlement_statements").select("id,business_id,settlement_period_id,barber_user_id,gross_basis_cents,tips_cents,adjustments_cents,refunds_cents,final_amount_cents,status,statement_snapshot,published_at,paid_at,created_at").order("created_at", { ascending: false }).limit(100);
  let calculations = admin.from("commission_calculations").select("id,barber_user_id,settlement_period_id,square_payment_id,attribution_type,attribution_source,gross_service_cents,discount_cents,tip_cents,eligible_basis_cents,barber_rate,barber_amount_cents,shop_amount_cents,status,calculated_at,locked_at").order("calculated_at", { ascending: false }).limit(300);
  let disputes = admin.from("commission_disputes").select("id,calculation_id,barber_user_id,reason_code,explanation,status,submitted_at,due_at,resolved_at,resolution_reason,created_at").order("created_at", { ascending: false }).limit(100);
  if (!administrative) { statements = statements.eq("barber_user_id", session.user.id); calculations = calculations.eq("barber_user_id", session.user.id); disputes = disputes.eq("barber_user_id", session.user.id); }
  const [statementResult, calculationResult, disputeResult] = await Promise.all([statements, calculations, disputes]);
  if (statementResult.error || calculationResult.error || disputeResult.error) return NextResponse.json({ ok: false, message: "Statement records could not be loaded." }, { status: 503 });

  const statementRows = statementResult.data ?? [];
  const calculationRows = calculationResult.data ?? [];
  const disputeRows = disputeResult.data ?? [];
  const barberUserIds = [...new Set([
    ...statementRows.map((row) => String(row.barber_user_id ?? "")),
    ...calculationRows.map((row) => String(row.barber_user_id ?? "")),
    ...disputeRows.map((row) => String(row.barber_user_id ?? "")),
  ].filter(Boolean))];
  const barberNames = new Map<string, string>();

  if (barberUserIds.length) {
    const businessIds = [...new Set(statementRows.map((row) => String(row.business_id ?? "")).filter(Boolean))];
    let barberQuery = admin.from("barber_profiles").select("staff_user_id,display_name").in("staff_user_id", barberUserIds);
    if (businessIds.length) barberQuery = barberQuery.in("business_id", businessIds);
    const { data: barberProfiles } = await barberQuery;
    for (const profile of barberProfiles ?? []) {
      if (profile.staff_user_id && profile.display_name) barberNames.set(String(profile.staff_user_id), String(profile.display_name));
    }

    const missingIds = barberUserIds.filter((id) => !barberNames.has(id));
    if (missingIds.length) {
      const { data: profiles } = await admin.from("profiles").select("id,display_name,full_name").in("id", missingIds);
      for (const profile of profiles ?? []) {
        const label = profile.display_name || profile.full_name;
        if (profile.id && label) barberNames.set(String(profile.id), String(label));
      }
    }
  }

  const withBarberName = <T extends { barber_user_id: string }>(row: T) => ({
    ...row,
    barber_name: barberNames.get(String(row.barber_user_id)) ?? (administrative ? "Unlinked barber" : "My account"),
  });

  return NextResponse.json({
    ok: true,
    live: true,
    statements: statementRows.map(withBarberName),
    calculations: calculationRows.map(withBarberName),
    disputes: disputeRows.map(withBarberName),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { action?: string; calculationId?: string; reasonCode?: string; explanation?: string; barberUserId?: string; settlementPeriodId?: string; amountCents?: number; reason?: string } | null;
  if (!body?.action) return NextResponse.json({ ok: false, message: "An action is required." }, { status: 400 });

  if (body.action === "create_dispute") {
    return NextResponse.json(
      { ok: false, message: "Under the confirmed commission rule, disputes must be submitted to the owner by SMS within 24 hours." },
      { status: 409 },
    );
  }

  if (!session.roles.some((role) => adminRoles.has(role))) return NextResponse.json({ ok: false, message: "Owner or manager access is required." }, { status: 403 });

  if (body.action === "run_reconciliation") {
    if (!session.roles.some((role) => role === "owner" || role === "super_admin")) return NextResponse.json({ ok: false, message: "Owner access is required to update calculated amounts." }, { status: 403 });
    // Square is live in production. This gate previously refused to calculate
    // whenever NEXT_PUBLIC_FEATURE_LIVE_SQUARE was unset or false in Vercel,
    // returning 409 before reading any data - which is why commissions always
    // appeared empty. Reconciliation is safe to run regardless: it reads
    // confirmed Square payments and writes only calculated rows.
    try {
      const result = await reconcileCommissions();
      return NextResponse.json({ ok: true, result });
    } catch (error) {
      return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Calculated amounts could not be updated." }, { status: 500 });
    }
  }

  if (body.action === "create_adjustment") {
    if (!body.calculationId || !body.barberUserId || !Number.isInteger(body.amountCents) || (body.reason?.trim().length ?? 0) < 8) return NextResponse.json({ ok: false, message: "Calculation, Barber, amount in cents, and reason are required." }, { status: 422 });
    const { data: calculation } = await admin.from("commission_calculations").select("business_id,settlement_period_id").eq("id", body.calculationId).maybeSingle();
    if (!calculation) return NextResponse.json({ ok: false, message: "Calculation not found." }, { status: 404 });
    const { data: adjustment, error } = await admin.from("commission_adjustments").insert({ business_id: calculation.business_id, calculation_id: body.calculationId, settlement_period_id: calculation.settlement_period_id, barber_user_id: body.barberUserId, amount_cents: body.amountCents, reason_code: "owner_correction", reason: body.reason!.trim().slice(0, 2000), status: "approved", created_by: session.user.id, approved_by: session.user.id, approved_at: new Date().toISOString() }).select("id").single();
    if (error || !adjustment?.id) return NextResponse.json({ ok: false, message: "The Adjustment could not be created." }, { status: 500 });
    await admin.from("audit_logs").insert({ business_id: calculation.business_id, actor_user_id: session.user.id, action: "commission_adjustment_created", resource_type: "commission_adjustment", resource_id: adjustment.id, metadata: { calculationId: body.calculationId, amountCents: body.amountCents } });
    return NextResponse.json({ ok: true, adjustmentId: adjustment.id }, { status: 201 });
  }

  if (body.action === "generate_statement") {
    if (!body.barberUserId || !body.settlementPeriodId) return NextResponse.json({ ok: false, message: "Barber and settlement period are required." }, { status: 422 });
    const { data: period } = await admin.from("settlement_periods").select("id,business_id,status").eq("id", body.settlementPeriodId).maybeSingle();
    if (!period) return NextResponse.json({ ok: false, message: "Settlement period not found." }, { status: 404 });
    const { data: lines } = await admin.from("commission_calculations").select("id,eligible_basis_cents,tip_cents,refund_cents,barber_amount_cents,status,attribution_type,barber_rate").eq("settlement_period_id", period.id).eq("barber_user_id", body.barberUserId).neq("status", "voided");
    const { data: adjustments } = await admin.from("commission_adjustments").select("id,amount_cents,status").eq("settlement_period_id", period.id).eq("barber_user_id", body.barberUserId).in("status", ["approved","applied"]);
    const totals = { grossBasisCents: (lines ?? []).reduce((sum, line) => sum + Number(line.eligible_basis_cents ?? 0), 0), tipsCents: (lines ?? []).reduce((sum, line) => sum + Number(line.tip_cents ?? 0), 0), refundsCents: (lines ?? []).reduce((sum, line) => sum + Number(line.refund_cents ?? 0), 0), adjustmentsCents: (adjustments ?? []).reduce((sum, line) => sum + Number(line.amount_cents ?? 0), 0), calculatedCents: (lines ?? []).reduce((sum, line) => sum + Number(line.barber_amount_cents ?? 0), 0) };
    const finalAmountCents = totals.calculatedCents + totals.adjustmentsCents;
    const { data: statement, error } = await admin.from("settlement_statements").upsert({ business_id: period.business_id, settlement_period_id: period.id, barber_user_id: body.barberUserId, gross_basis_cents: totals.grossBasisCents, tips_cents: totals.tipsCents, adjustments_cents: totals.adjustmentsCents, refunds_cents: totals.refundsCents, final_amount_cents: finalAmountCents, status: "review", statement_snapshot: { ruleSetVersion: "1.0", lines: lines ?? [], adjustments: adjustments ?? [], totals, payoutMethod: "manual_zelle_or_cash" }, published_at: new Date().toISOString() }, { onConflict: "settlement_period_id,barber_user_id" }).select("id").single();
    if (error || !statement?.id) return NextResponse.json({ ok: false, message: "The statement could not be generated. Final or paid statements cannot be overwritten." }, { status: 500 });
    return NextResponse.json({ ok: true, statementId: statement.id });
  }

  return NextResponse.json({ ok: false, message: "Unsupported statement action." }, { status: 400 });
}
