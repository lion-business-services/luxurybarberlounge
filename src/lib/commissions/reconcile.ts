import "server-only";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { calculateCommission } from "./engine";

function startOfCurrentMonday() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

async function exception(admin: any, runId: string, businessId: string, paymentId: string, code: string, message: string, details: Record<string, unknown> = {}) {
  const { data: existing } = await admin.from("reconciliation_exceptions").select("id").eq("reconciliation_run_id", runId).eq("resource_type", "square_payment").eq("resource_id", paymentId).eq("exception_code", code).eq("status", "open").maybeSingle();
  if (!existing?.id) await admin.from("reconciliation_exceptions").insert({ business_id: businessId, reconciliation_run_id: runId, resource_type: "square_payment", resource_id: paymentId, exception_code: code, severity: "warning", message, details, status: "open" });
}

export async function reconcileCommissions(limit = 100) {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new Error("Supabase is not configured.");
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) throw new Error("Business context is unavailable.");
  const businessId = String(business.id);
  const { data: location } = await admin.from("locations").select("id").eq("business_id", businessId).eq("slug", "northfield").maybeSingle();

  const monday = startOfCurrentMonday();
  const sundayEnd = new Date(monday); sundayEnd.setUTCDate(sundayEnd.getUTCDate() + 7);
  const label = `${monday.toISOString().slice(0, 10)} to ${new Date(sundayEnd.getTime() - 1).toISOString().slice(0, 10)}`;
  const { data: period, error: periodError } = await admin.from("settlement_periods").upsert({ business_id: businessId, location_id: location?.id ?? null, label, starts_at: monday.toISOString(), ends_at: sundayEnd.toISOString(), review_deadline: new Date(sundayEnd.getTime() + 24 * 60 * 60_000).toISOString(), status: "open" }, { onConflict: "business_id,location_id,starts_at,ends_at" }).select("id").single();
  if (periodError || !period?.id) throw periodError ?? new Error("Settlement period could not be prepared.");

  const { data: run, error: runError } = await admin.from("reconciliation_runs").insert({ business_id: businessId, settlement_period_id: period.id, run_type: "provisional", status: "running", started_at: new Date().toISOString(), summary: {} }).select("id").single();
  if (runError || !run?.id) throw runError ?? new Error("Reconciliation run could not be started.");

  const [{ data: commissionRule }, { data: attributionRule }] = await Promise.all([
    admin.from("commission_rule_versions").select("id,version,barber_rate,shop_rate,tips_to_barber,include_discounts,include_taxes,include_processing_fees,commission_rules!inner(active,business_id)").eq("commission_rules.business_id", businessId).eq("commission_rules.active", true).lte("effective_from", new Date().toISOString()).order("priority").limit(1).maybeSingle(),
    admin.from("attribution_rule_versions").select("id,version,attribution_rules!inner(active,business_id)").eq("attribution_rules.business_id", businessId).eq("attribution_rules.active", true).lte("effective_from", new Date().toISOString()).order("priority").limit(1).maybeSingle(),
  ]);
  if (!commissionRule?.id || !attributionRule?.id) {
    await admin.from("reconciliation_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_summary: "Active policy versions are missing." }).eq("id", run.id);
    throw new Error("Active commission and attribution policy versions are required.");
  }

  const { data: payments, error } = await admin.from("square_payments").select("id,square_id,square_order_id,status,amount_cents,tip_cents,processing_fee_cents,created_at_square").eq("business_id", businessId).in("status", ["COMPLETED", "APPROVED"]).gte("created_at_square", new Date(Date.now() - 21 * 24 * 60 * 60_000).toISOString()).order("created_at_square").limit(limit);
  if (error) throw error;
  let calculated = 0, exceptions = 0, skipped = 0;

  for (const payment of payments ?? []) {
    const { data: existing } = await admin.from("commission_calculations").select("id").eq("business_id", businessId).eq("square_payment_id", payment.square_id).limit(1).maybeSingle();
    if (existing?.id) { skipped += 1; continue; }
    if (!payment.square_order_id) { await exception(admin, run.id, businessId, payment.square_id, "ORDER_MISSING", "Payment has no Square order mapping."); exceptions += 1; continue; }

    const { data: order } = await admin.from("square_orders").select("id,square_id,total_cents,tax_cents,discount_cents").eq("business_id", businessId).eq("square_id", payment.square_order_id).maybeSingle();
    if (!order?.id) { await exception(admin, run.id, businessId, payment.square_id, "ORDER_NOT_SYNCED", "The related Square order has not been synchronized."); exceptions += 1; continue; }
    const { data: extension } = await admin.from("order_extensions").select("booking_metadata_id,reconciliation_status").eq("square_order_id", order.id).maybeSingle();
    if (!extension?.booking_metadata_id || extension.reconciliation_status !== "matched") { await exception(admin, run.id, businessId, payment.square_id, "ORDER_NOT_MATCHED", "Match the order to a booking before calculating commission.", { squareOrderId: order.square_id }); exceptions += 1; continue; }
    const { data: booking } = await admin.from("booking_metadata").select("id,client_user_id,barber_user_id,location_id,service_snapshot").eq("id", extension.booking_metadata_id).maybeSingle();
    if (!booking?.barber_user_id) { await exception(admin, run.id, businessId, payment.square_id, "BARBER_MISSING", "A verified barber assignment is required before calculation."); exceptions += 1; continue; }

    const { data: attribution } = await admin.from("booking_attributions").select("attribution_type,source,evidence").eq("booking_metadata_id", booking.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const attributionType = attribution?.attribution_type === "BARBER" ? "BARBER" : "SHOP";
    const orderNetCents = Math.max(0, Number(order.total_cents ?? payment.amount_cents ?? 0) - Number(order.tax_cents ?? 0));
    const refundResult = await admin.from("square_refunds").select("amount_cents").eq("business_id", businessId).eq("square_payment_id", payment.square_id).eq("status", "COMPLETED");
    const refunds = (refundResult.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount_cents ?? 0), 0);
    const result = calculateCommission({
      serviceRevenueCents: orderNetCents,
      discountsCents: 0,
      refundsCents: refunds,
      taxesCents: Number(order.tax_cents ?? 0),
      tipsCents: Number(payment.tip_cents ?? 0),
      processingFeesCents: Number(payment.processing_fee_cents ?? 0),
      attribution: attributionType,
      rule: {
        id: String(commissionRule.id),
        version: Number(commissionRule.version ?? 1),
        barberRate: Number(commissionRule.barber_rate ?? 0.7),
        shopRate: Number(commissionRule.shop_rate ?? 0.3),
        tipsToBarber: commissionRule.tips_to_barber !== false,
        includeDiscounts: commissionRule.include_discounts === true,
        includeTaxes: commissionRule.include_taxes === true,
        includeProcessingFees: commissionRule.include_processing_fees === true,
      },
    });
    const { error: calculationError } = await admin.from("commission_calculations").insert({
      business_id: businessId,
      settlement_period_id: period.id,
      reconciliation_run_id: run.id,
      barber_user_id: booking.barber_user_id,
      client_user_id: booking.client_user_id ?? null,
      booking_metadata_id: booking.id,
      square_order_id: order.square_id,
      square_payment_id: payment.square_id,
      location_id: booking.location_id ?? location?.id ?? null,
      attribution_type: attributionType,
      attribution_source: attribution?.source ?? "default_shop",
      attribution_evidence: attribution?.evidence ?? { defaulted: true },
      attribution_rule_version_id: attributionRule.id,
      commission_rule_version_id: commissionRule.id,
      gross_service_cents: orderNetCents,
      discount_cents: Number(order.discount_cents ?? 0),
      tax_cents: Number(order.tax_cents ?? 0),
      tip_cents: Number(payment.tip_cents ?? 0),
      refund_cents: refunds,
      processing_fee_cents: Number(payment.processing_fee_cents ?? 0),
      eligible_basis_cents: result.eligibleBasisCents,
      excluded_cents: result.excludedCents,
      barber_rate: result.effectiveBarberRate,
      shop_rate: attributionType === "BARBER" ? 0 : Number(commissionRule.shop_rate ?? 0.3),
      barber_amount_cents: result.barberAmountCents,
      shop_amount_cents: result.shopAmountCents,
      status: "provisional",
      metadata: { policy_version: "1.0", tips_outside_basis: true, calculation_source: "matched_square_payment" },
    });
    if (calculationError) { await exception(admin, run.id, businessId, payment.square_id, "CALCULATION_INSERT_FAILED", "The calculation could not be stored.", { code: calculationError.code }); exceptions += 1; }
    else calculated += 1;
  }

  const { data: periodLines } = await admin
    .from("commission_calculations")
    .select("id,barber_user_id,eligible_basis_cents,tip_cents,refund_cents,barber_amount_cents,status,attribution_type,barber_rate")
    .eq("settlement_period_id", period.id)
    .neq("status", "voided");
  const barberIds = [...new Set((periodLines ?? []).map((line: any) => String(line.barber_user_id)).filter(Boolean))];
  let statementsPrepared = 0;
  for (const barberUserId of barberIds) {
    const lines = (periodLines ?? []).filter((line: any) => String(line.barber_user_id) === barberUserId);
    const [{ data: adjustments }, { data: existingStatement }] = await Promise.all([
      admin.from("commission_adjustments").select("id,amount_cents,status,reason_code").eq("settlement_period_id", period.id).eq("barber_user_id", barberUserId).in("status", ["approved", "applied"]),
      admin.from("settlement_statements").select("id,status").eq("settlement_period_id", period.id).eq("barber_user_id", barberUserId).maybeSingle(),
    ]);
    if (existingStatement?.status && ["final", "paid", "voided"].includes(existingStatement.status)) continue;
    const grossBasisCents = lines.reduce((sum: number, line: any) => sum + Number(line.eligible_basis_cents ?? 0), 0);
    const tipsCents = lines.reduce((sum: number, line: any) => sum + Number(line.tip_cents ?? 0), 0);
    const refundsCents = lines.reduce((sum: number, line: any) => sum + Number(line.refund_cents ?? 0), 0);
    const adjustmentsCents = (adjustments ?? []).reduce((sum: number, line: any) => sum + Number(line.amount_cents ?? 0), 0);
    const calculatedCents = lines.reduce((sum: number, line: any) => sum + Number(line.barber_amount_cents ?? 0), 0);
    const { error: statementError } = await admin.from("settlement_statements").upsert({
      business_id: businessId,
      settlement_period_id: period.id,
      barber_user_id: barberUserId,
      gross_basis_cents: grossBasisCents,
      tips_cents: tipsCents,
      adjustments_cents: adjustmentsCents,
      refunds_cents: refundsCents,
      final_amount_cents: calculatedCents + adjustmentsCents,
      status: "provisional",
      statement_snapshot: {
        policyVersion: "1.0",
        generatedBy: "automatic_reconciliation",
        lineCount: lines.length,
        adjustmentCount: (adjustments ?? []).length,
        payoutMethod: "manual_zelle_or_cash",
        generatedAt: new Date().toISOString(),
      },
    }, { onConflict: "settlement_period_id,barber_user_id" });
    if (!statementError) statementsPrepared += 1;
  }

  const status = exceptions ? "completed_with_exceptions" : "completed";
  await admin.from("reconciliation_runs").update({
    status,
    completed_at: new Date().toISOString(),
    summary: { calculated, exceptions, skipped, statementsPrepared, policyVersion: "1.0" },
  }).eq("id", run.id);
  return { runId: run.id, settlementPeriodId: period.id, calculated, exceptions, skipped, statementsPrepared, status };
}
