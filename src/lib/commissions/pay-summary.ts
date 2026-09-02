import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { reconcilePendingWalkInSquarePayments } from "@/lib/queue/payments";

type Admin = NonNullable<ReturnType<typeof createUntypedAdminSupabase>>;
type Row = Record<string, unknown>;

const adminRoles = new Set(["manager", "owner", "super_admin"]);

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function localized(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Row;
    if (typeof row.en === "string" && row.en.trim()) return row.en.trim();
    if (typeof row.es === "string" && row.es.trim()) return row.es.trim();
  }
  return fallback;
}

function joinedRecord(value: unknown): Row | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === "object" ? value[0] as Row : null;
  return value && typeof value === "object" ? value as Row : null;
}

export type CommissionViewer = { userId: string; roles: readonly string[] };

export async function loadCommissionPaySummary(viewer: CommissionViewer) {
  const admin = createUntypedAdminSupabase();
  if (!admin) return { ok: true, live: false, statements: [], calculations: [], disputes: [] };
  if (!viewer.roles.some((role) => role === "barber" || adminRoles.has(role))) throw new Error("FORBIDDEN");

  const administrative = viewer.roles.some((role) => adminRoles.has(role));
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  if (!business?.id) return { ok: true, live: false, statements: [], calculations: [], disputes: [] };
  const businessId = String(business.id);

  await reconcilePendingWalkInSquarePayments(admin, businessId).catch(() => ({ matched: 0 }));

  let seesAllBarbers = administrative;
  if (!administrative) {
    const { data: me } = await admin.from("barber_profiles").select("can_claim_for_any_barber").eq("staff_user_id", viewer.userId).maybeSingle();
    if (me?.can_claim_for_any_barber === true) seesAllBarbers = true;
  }

  let statementQuery = admin.from("settlement_statements")
    .select("id,business_id,settlement_period_id,barber_user_id,barber_profile_id,gross_basis_cents,tips_cents,adjustments_cents,refunds_cents,final_amount_cents,status,statement_snapshot,published_at,paid_at,payout_method,payout_reference,paid_by,created_at,settlement_periods(label,starts_at,ends_at)")
    .eq("business_id", businessId).order("created_at", { ascending: false }).limit(150);
  let calculationQuery = admin.from("commission_calculations")
    .select("id,barber_user_id,barber_profile_id,settlement_period_id,client_user_id,client_record_id,appointment_id,queue_entry_id,service_id,square_order_id,square_payment_id,attribution_type,attribution_source,attribution_evidence,gross_service_cents,discount_cents,tip_cents,processing_fee_cents,eligible_basis_cents,barber_rate,shop_rate,barber_amount_cents,shop_amount_cents,status,calculated_at,locked_at,metadata")
    .eq("business_id", businessId).neq("status", "voided").order("calculated_at", { ascending: false }).limit(500);
  let disputeQuery = admin.from("commission_disputes")
    .select("id,calculation_id,barber_user_id,reason_code,explanation,status,submitted_at,due_at,resolved_at,resolution_reason,created_at")
    .eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);

  if (!seesAllBarbers) {
    statementQuery = statementQuery.eq("barber_user_id", viewer.userId);
    calculationQuery = calculationQuery.eq("barber_user_id", viewer.userId);
    disputeQuery = disputeQuery.eq("barber_user_id", viewer.userId);
  }

  const [statementResult, calculationResult, disputeResult] = await Promise.all([statementQuery, calculationQuery, disputeQuery]);
  if (statementResult.error || calculationResult.error || disputeResult.error) throw new Error("Statement records could not be loaded.");

  const statements = (statementResult.data ?? []) as Row[];
  const calculations = (calculationResult.data ?? []) as Row[];
  const disputes = (disputeResult.data ?? []) as Row[];
  const barberIds = [...new Set([...statements, ...calculations, ...disputes].map((row) => text(row.barber_user_id)).filter((id): id is string => Boolean(id)))];
  const clientIds = [...new Set(calculations.map((row) => text(row.client_record_id)).filter((id): id is string => Boolean(id)))];
  const appointmentIds = [...new Set(calculations.map((row) => text(row.appointment_id)).filter((id): id is string => Boolean(id)))];
  const queueIds = [...new Set(calculations.map((row) => text(row.queue_entry_id)).filter((id): id is string => Boolean(id)))];
  const serviceIds = [...new Set(calculations.map((row) => text(row.service_id)).filter((id): id is string => Boolean(id)))];
  const squarePaymentIds = [...new Set(calculations.map((row) => text(row.square_payment_id)).filter((id): id is string => Boolean(id)))];

  const [barbersResult, clientsResult, appointmentsResult, queueResult, servicesResult, squarePaymentsResult] = await Promise.all([
    barberIds.length ? admin.from("barber_profiles").select("staff_user_id,display_name").in("staff_user_id", barberIds) : Promise.resolve({ data: [], error: null }),
    clientIds.length ? admin.from("clients").select("id,first_name,last_name,email,phone").in("id", clientIds) : Promise.resolve({ data: [], error: null }),
    appointmentIds.length ? admin.from("appointments").select("id,client_name_snapshot,service_name_snapshot,public_reference").in("id", appointmentIds) : Promise.resolve({ data: [], error: null }),
    queueIds.length ? admin.from("queue_entries").select("id,client_name,service_slug,public_token").in("id", queueIds) : Promise.resolve({ data: [], error: null }),
    serviceIds.length ? admin.from("services").select("id,name,slug").in("id", serviceIds) : Promise.resolve({ data: [], error: null }),
    squarePaymentIds.length ? admin.from("square_payments").select("square_id,raw").in("square_id", squarePaymentIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const barberNames = new Map((barbersResult.data ?? []).map((row) => [String(row.staff_user_id), localized(row.display_name, "Barber")]));
  const clientNames = new Map((clientsResult.data ?? []).map((row) => [String(row.id), [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ").trim() || text(row.email) || text(row.phone) || "Client"]));
  const appointmentMap = new Map((appointmentsResult.data ?? []).map((row) => [String(row.id), row as Row]));
  const queueMap = new Map((queueResult.data ?? []).map((row) => [String(row.id), row as Row]));
  const serviceMap = new Map((servicesResult.data ?? []).map((row) => [String(row.id), localized(row.name, text(row.slug) ?? "Service")]));
  const squareReceiptMap = new Map<string, { number: string | null; url: string | null }>();
  for (const payment of squarePaymentsResult.data ?? []) {
    const raw = payment.raw && typeof payment.raw === "object" && !Array.isArray(payment.raw) ? payment.raw as Row : {};
    squareReceiptMap.set(String(payment.square_id), { number: text(raw.receipt_number), url: text(raw.receipt_url) });
  }

  const enrichedCalculations = calculations.map((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Row : {};
    const appointment = text(row.appointment_id) ? appointmentMap.get(String(row.appointment_id)) : null;
    const queue = text(row.queue_entry_id) ? queueMap.get(String(row.queue_entry_id)) : null;
    const squareReceipt = text(row.square_payment_id) ? squareReceiptMap.get(String(row.square_payment_id)) : null;
    const clientName = text(metadata.clientName)
      ?? (text(row.client_record_id) ? clientNames.get(String(row.client_record_id)) ?? null : null)
      ?? text(appointment?.client_name_snapshot)
      ?? text(queue?.client_name)
      ?? "Client";
    const serviceName = text(metadata.serviceName)
      ?? (text(row.service_id) ? serviceMap.get(String(row.service_id)) ?? null : null)
      ?? text(appointment?.service_name_snapshot)
      ?? text(queue?.service_slug)?.replaceAll("-", " ")
      ?? "Service";
    return {
      ...row,
      barber_name: barberNames.get(String(row.barber_user_id)) ?? (administrative ? "Unlinked barber" : "My account"),
      client_name: clientName,
      service_name: serviceName,
      payment_method: text(metadata.paymentMethod) ?? (row.square_payment_id ? "square" : "other"),
      receipt_number: text(metadata.receiptNumber) ?? squareReceipt?.number ?? null,
      receipt_url: text(metadata.receiptUrl) ?? squareReceipt?.url ?? null,
      public_reference: text(appointment?.public_reference) ?? text(queue?.public_token),
    };
  });

  const enrichedStatements = statements.map((row) => {
    const period = joinedRecord(row.settlement_periods);
    return {
      ...row,
      barber_name: barberNames.get(String(row.barber_user_id)) ?? (administrative ? "Unlinked barber" : "My account"),
      period_label: text(period?.label) ?? "Weekly statement",
      period_starts_at: text(period?.starts_at),
      period_ends_at: text(period?.ends_at),
    };
  });

  const enrichedDisputes = disputes.map((row) => ({
    ...row,
    barber_name: barberNames.get(String(row.barber_user_id)) ?? (administrative ? "Unlinked barber" : "My account"),
  }));

  return { ok: true, live: true, statements: enrichedStatements, calculations: enrichedCalculations, disputes: enrichedDisputes };
}
