import type { Json } from "./database.types";

export type PolicyState = "locked" | "proposed" | "open";
export type PolicyApprovalStatus = "pending" | "approved" | "rejected" | "superseded";
export type AttributionDecisionStatus = "submitted" | "under_review" | "needs_information" | "approved" | "rejected" | "withdrawn";
export type CommissionLineStatus = "draft" | "calculated" | "disputed" | "locked" | "paid" | "voided";
export type StatementStatus = "draft" | "issued" | "disputed" | "locked" | "paid" | "superseded";

export type PolicyVersionRecord = {
  id: string;
  business_id: string;
  policy_key: string;
  version: string;
  state: PolicyState;
  effective_from: string | null;
  effective_to: string | null;
  rules: Json;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
};

export type PolicyOpenItemRecord = {
  id: string;
  business_id: string;
  policy_version_id: string | null;
  item_key: string;
  question: string;
  state: "open" | "answered" | "deferred";
  answer: Json | null;
  answered_by: string | null;
  answered_at: string | null;
  legal_review_required: boolean;
  created_at: string;
  updated_at: string;
};

export type AttributionClaimRecord = {
  id: string;
  business_id: string;
  location_id: string | null;
  barber_user_id: string;
  client_id: string | null;
  client_email: string | null;
  client_phone: string | null;
  claim_type: string;
  status: AttributionDecisionStatus;
  explanation: string;
  criteria: Json;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type ClientBarberAttributionRecord = {
  id: string;
  business_id: string;
  client_id: string;
  barber_user_id: string;
  attribution_type: "SHOP" | "BARBER";
  source: string;
  evidence_reference: string | null;
  rule_version: string;
  effective_from: string;
  locked_at: string | null;
  created_at: string;
};

export type QueueAssignmentRecord = {
  id: string;
  queue_entry_id: string;
  barber_user_id: string;
  assignment_rule_version_id: string | null;
  source: "automatic" | "manual";
  reasons: Json;
  score: number | null;
  override_reason: string | null;
  assigned_by: string | null;
  assigned_at: string;
};

export type CommissionCalculationRecord = {
  id: string;
  business_id: string;
  settlement_period_id: string | null;
  barber_user_id: string;
  square_payment_id: string | null;
  transaction_type: string;
  attribution_type: "SHOP" | "BARBER" | "EXCEPTION";
  attribution_source: string;
  gross_service_cents: number;
  discount_cents: number;
  tip_cents: number;
  tax_cents: number;
  processing_fee_cents: number;
  eligible_basis_cents: number;
  barber_rate_basis_points: number;
  barber_amount_cents: number;
  shop_amount_cents: number;
  rule_set_version: string;
  status: CommissionLineStatus;
  calculated_at: string;
  locked_at: string | null;
};

export type CommissionAdjustmentRecord = {
  id: string;
  business_id: string;
  related_calculation_id: string;
  statement_id: string | null;
  amount_cents: number;
  direction: "positive" | "negative";
  reason: string;
  evidence: Json;
  approved_by: string;
  created_by: string;
  created_at: string;
};

export type SettlementStatementRecord = {
  id: string;
  business_id: string;
  settlement_period_id: string;
  barber_user_id: string;
  statement_number: string;
  gross_basis_cents: number;
  tips_cents: number;
  adjustments_cents: number;
  refunds_cents: number;
  final_amount_cents: number;
  rule_set_version: string;
  status: StatementStatus;
  issued_at: string | null;
  locked_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type NotificationJobRecord = {
  id: string;
  business_id: string | null;
  channel: "email" | "sms";
  template_key: string;
  recipient: string;
  preferred_language: "en" | "es";
  classification: "transactional" | "marketing";
  payload: Json;
  idempotency_key: string;
  status: "pending" | "processing" | "sent" | "failed" | "suppressed";
  attempt_count: number;
  next_attempt_at: string | null;
  created_at: string;
};
