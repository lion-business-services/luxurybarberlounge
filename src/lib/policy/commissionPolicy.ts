export type PolicyRuleState = "locked" | "proposed" | "open";

export type PolicyRule = {
  key: string;
  label: string;
  state: PolicyRuleState;
  summary: string;
  effectiveValue?: string;
};

export const commissionPolicyMeta = {
  key: "attribution_commission",
  version: "1.0",
  effectiveFrom: "2026-01-06",
  timezone: "America/New_York",
  source: "LBL-Commission-Policy-v1.0.docx",
} as const;

export const lockedCommissionRules: PolicyRule[] = [
  { key: "shop_client_split", label: "Shop-generated client", state: "locked", summary: "70% independent barber / 30% Shop.", effectiveValue: "70 / 30" },
  { key: "barber_client_split", label: "Verified pre-existing client", state: "locked", summary: "100% independent barber when valid evidence establishes the relationship.", effectiveValue: "100 / 0" },
  { key: "tips", label: "Tips", state: "locked", summary: "100% independent barber and excluded from Commission Basis.", effectiveValue: "100% Barber" },
  { key: "default_attribution", label: "Default attribution", state: "locked", summary: "SHOP unless the independent barber establishes BARBER attribution.", effectiveValue: "SHOP" },
  { key: "walkins", label: "Walk-ins", state: "locked", summary: "Walk-ins are SHOP-attributed.", effectiveValue: "SHOP" },
  { key: "attribution_dispute_window", label: "Dispute window", state: "locked", summary: "24 hours, submitted by SMS to the owner.", effectiveValue: "24 hours by SMS" },
  { key: "integrity_volume_flag", label: "Volume integrity flag", state: "locked", summary: "Review when more than 40% of new clients are claimed as pre-existing.", effectiveValue: "> 40%" },
  { key: "settlement_week", label: "Settlement week", state: "locked", summary: "Monday 12:00 a.m. through Sunday 11:59 p.m., Eastern Time.", effectiveValue: "Monday–Sunday" },
  { key: "statement_issue_day", label: "Statement issue day", state: "locked", summary: "Statement issued Monday.", effectiveValue: "Monday" },
  { key: "payout_method", label: "Settlement method", state: "locked", summary: "Manual owner settlement by Zelle or cash. The platform does not move money.", effectiveValue: "Manual" },
  { key: "immutability", label: "Locked calculations", state: "locked", summary: "Immutable. Corrections use a separate Adjustment.", effectiveValue: "Immutable" },
];

export const proposedCommissionRules: PolicyRule[] = [
  { key: "pre_existing_definition", label: "Verified pre-existing definition", state: "proposed", summary: "Require all four policy criteria and documentary evidence." },
  { key: "evidence_standard", label: "Evidence standard", state: "proposed", summary: "Unsupported assertion alone is insufficient." },
  { key: "roster_window", label: "Imported roster filing window", state: "proposed", summary: "One roster within 14 calendar days of the Barber start date." },
  { key: "attribution_persistence", label: "Client-and-Barber persistence", state: "proposed", summary: "Attribution persists for the specific pairing and does not transfer to another Barber." },
  { key: "discount_treatment", label: "Service-level discounts", state: "proposed", summary: "Reduce Commission Basis proportionally." },
  { key: "promotion_treatment", label: "Shop-funded promotions", state: "proposed", summary: "Reduce basis unless designated marketing-funded before launch." },
  { key: "deposit_treatment", label: "Deposits", state: "proposed", summary: "No commission event until the service is completed." },
  { key: "forfeited_deposit", label: "Forfeited deposits and no-show fees", state: "proposed", summary: "Retained 100% by the Shop because no service was performed." },
  { key: "late_cancel_fee", label: "Late-cancellation fees", state: "proposed", summary: "Retained 100% by the Shop." },
  { key: "refund_adjustment", label: "Refunds and chargebacks", state: "proposed", summary: "Post as separate negative Adjustments, never historical edits." },
  { key: "chargeback_fee", label: "Chargeback fee", state: "proposed", summary: "Borne by the Shop." },
  { key: "redemption_only", label: "Gift cards, packages, and memberships", state: "proposed", summary: "Create a service commission event on redemption only." },
  { key: "multi_barber_ticket", label: "Multi-Barber tickets", state: "proposed", summary: "Split by service line and performing Barber." },
  { key: "square_required", label: "All transactions through Square", state: "proposed", summary: "Off-platform collection is prohibited and creates an integrity exception." },
  { key: "rounding", label: "Line-level rounding", state: "proposed", summary: "Nearest cent, half-up, at each statement line." },
  { key: "statement_dispute_window", label: "Statement dispute window", state: "proposed", summary: "24 hours from delivery." },
  { key: "statement_lock", label: "Statement lock", state: "proposed", summary: "Tuesday at 5:00 p.m. Eastern." },
  { key: "settlement_day", label: "Manual settlement day", state: "proposed", summary: "Wednesday after statement lock." },
  { key: "rule_change_notice", label: "Rule-change notice", state: "proposed", summary: "14 calendar days written notice, never retroactive." },
  { key: "record_retention", label: "Record retention", state: "proposed", summary: "Seven years for statements, evidence, disputes, decisions, and audit logs." },
];

export const policyOpenItems: PolicyRule[] = [
  { key: "structure", label: "Operating structure", state: "open", summary: "Is the arrangement booth rental or percentage commission? The descriptions are mutually exclusive." },
  { key: "rent", label: "Rent amount and interaction", state: "open", summary: "If rent applies, state amount, period, and whether it replaces or accompanies the split." },
  { key: "processing_fees", label: "Processing fees", state: "open", summary: "Does the Shop absorb fees or deduct them before the split?" },
  { key: "product_commission_rate", label: "Product commission rate", state: "open", summary: "Enter the percentage on pre-tax product price, if any." },
  { key: "product_commission_exists", label: "Product commission eligibility", state: "open", summary: "Confirm whether any product commission exists." },
  { key: "membership_values", label: "Membership redemption values", state: "open", summary: "Enter an imputed service value for each tier." },
  { key: "package_values", label: "Package per-visit values", state: "open", summary: "Enter the value used for each redemption." },
  { key: "deposit_schedule", label: "Deposit and no-show schedule", state: "open", summary: "Enter deposit amount and no-show or late-cancellation fees." },
  { key: "late_cancel_hours", label: "Late-cancellation threshold", state: "open", summary: "Enter how many hours before an appointment is considered late." },
  { key: "barber_start_dates", label: "Barber start dates", state: "open", summary: "Confirm each active independent Barber start date." },
  { key: "contractor_agreements", label: "Independent-contractor agreements", state: "open", summary: "Confirm signed agreement status for each Barber." },
  { key: "final_roster_services", label: "Final roster and service list", state: "open", summary: "Confirm the final Barber count and published services." },
];
