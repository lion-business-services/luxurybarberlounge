import type { AttributionType } from "../attribution/engine.ts";

export type CommissionRule = {
  id: string;
  version: number;
  barberRate: number;
  shopRate: number;
  tipsToBarber: boolean;
  includeDiscounts: boolean;
  includeTaxes: boolean;
  includeProcessingFees: boolean;
};

export type CommissionInput = {
  serviceRevenueCents: number;
  productRevenueCents?: number;
  membershipRevenueCents?: number;
  tipsCents?: number;
  taxesCents?: number;
  discountsCents?: number;
  refundsCents?: number;
  processingFeesCents?: number;
  attribution: AttributionType;
  rule: CommissionRule;
};

export type CommissionResult = {
  eligibleBasisCents: number;
  excludedCents: number;
  barberAmountCents: number;
  shopAmountCents: number;
  tipsCents: number;
  effectiveBarberRate: number;
  ruleId: string;
  ruleVersion: number;
};

function cents(value = 0) { return Math.max(0, Math.trunc(value)); }
function rateToBasisPoints(rate: number) { return Math.max(0, Math.min(10_000, Math.round(rate * 10_000))); }
function roundedShare(valueCents: number, rate: number) {
  const basisPoints = rateToBasisPoints(rate);
  return Math.floor((valueCents * basisPoints + 5_000) / 10_000);
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const service = cents(input.serviceRevenueCents);
  const discounts = cents(input.discountsCents);
  const refunds = cents(input.refundsCents);
  const taxes = cents(input.taxesCents);
  const fees = cents(input.processingFeesCents);
  const tips = cents(input.tipsCents);
  const eligibleBasisCents = Math.max(0, service - refunds - (input.rule.includeDiscounts ? 0 : discounts));
  const effectiveBarberRate = input.attribution === "BARBER" ? 1 : input.rule.barberRate;
  const baseBarber = roundedShare(eligibleBasisCents, effectiveBarberRate);
  const barberTips = input.rule.tipsToBarber ? tips : 0;
  const barberAmountCents = baseBarber + barberTips;
  const shopAmountCents = eligibleBasisCents - baseBarber + (input.rule.tipsToBarber ? 0 : tips) + (input.rule.includeTaxes ? taxes : 0) - (input.rule.includeProcessingFees ? fees : 0);
  return { eligibleBasisCents, excludedCents: service - eligibleBasisCents + taxes + fees, barberAmountCents: Math.max(0, barberAmountCents), shopAmountCents: Math.max(0, shopAmountCents), tipsCents: tips, effectiveBarberRate, ruleId: input.rule.id, ruleVersion: input.rule.version };
}

export type TransactionLineInput = {
  transactionType: "completed_service" | "deposit" | "forfeited_deposit" | "no_show_fee" | "late_cancel_fee" | "refund" | "chargeback" | "chargeback_reversal" | "gift_card_redemption" | "package_redemption" | "membership_redemption" | "retail_product";
  grossServiceCents?: number;
  addOnCents?: number;
  discountCents?: number;
  tipCents?: number;
  taxCents?: number;
  processingFeeCents?: number;
  amountCents?: number;
  attribution: Exclude<AttributionType, "EXCEPTION">;
  rule: CommissionRule;
  approvedPolicy: {
    processingFeesAbsorbedByShop: boolean;
    productCommissionRate?: number | null;
    forfeitedFeesToShop: boolean;
    redemptionValuesApproved: boolean;
  };
};

export type TransactionLineResult = CommissionResult & {
  transactionType: TransactionLineInput["transactionType"];
  createsCommissionEvent: boolean;
  adjustmentDirection: "none" | "positive" | "negative";
  reviewRequired: boolean;
  treatmentReason: string;
};

export function calculateTransactionLine(input: TransactionLineInput): TransactionLineResult {
  const amount = cents(input.amountCents);
  if (input.transactionType === "deposit") return noEvent(input, "A deposit is held until the service is completed.");
  if (["forfeited_deposit", "no_show_fee", "late_cancel_fee"].includes(input.transactionType)) {
    return noEvent(input, input.approvedPolicy.forfeitedFeesToShop ? "No service was performed; the approved policy retains the fee for the Shop." : "Owner approval is required before this proposed treatment is activated.", !input.approvedPolicy.forfeitedFeesToShop);
  }
  if (["refund", "chargeback"].includes(input.transactionType)) {
    return { ...calculateCommission({ serviceRevenueCents: amount, refundsCents: 0, attribution: input.attribution, rule: input.rule }), transactionType: input.transactionType, createsCommissionEvent: true, adjustmentDirection: "negative", reviewRequired: false, treatmentReason: "Post a separate negative Adjustment. Never edit the original locked calculation." };
  }
  if (input.transactionType === "chargeback_reversal") {
    return { ...calculateCommission({ serviceRevenueCents: amount, attribution: input.attribution, rule: input.rule }), transactionType: input.transactionType, createsCommissionEvent: true, adjustmentDirection: "positive", reviewRequired: false, treatmentReason: "Restore the previously reversed share through a positive Adjustment." };
  }
  if (input.transactionType === "retail_product") {
    const rate = input.approvedPolicy.productCommissionRate;
    if (rate == null) return noEvent(input, "Product commission is an unresolved owner decision.", true);
    const barberAmountCents = roundedShare(amount, rate);
    return { eligibleBasisCents: amount, excludedCents: 0, barberAmountCents, shopAmountCents: amount - barberAmountCents, tipsCents: 0, effectiveBarberRate: rate, ruleId: input.rule.id, ruleVersion: input.rule.version, transactionType: input.transactionType, createsCommissionEvent: true, adjustmentDirection: "none", reviewRequired: false, treatmentReason: "Approved product commission on the pre-tax product price." };
  }
  if (["gift_card_redemption", "package_redemption", "membership_redemption"].includes(input.transactionType) && !input.approvedPolicy.redemptionValuesApproved) return noEvent(input, "The redemption value is unresolved and cannot create a commission line yet.", true);

  const result = calculateCommission({ serviceRevenueCents: cents(input.grossServiceCents) + cents(input.addOnCents) || amount, tipsCents: input.tipCents, taxesCents: input.taxCents, discountsCents: input.discountCents, processingFeesCents: input.approvedPolicy.processingFeesAbsorbedByShop ? 0 : input.processingFeeCents, attribution: input.attribution, rule: input.rule });
  return { ...result, transactionType: input.transactionType, createsCommissionEvent: true, adjustmentDirection: "none", reviewRequired: false, treatmentReason: "Commission Basis is service revenue after service-level discounts. Tips remain separate." };
}

function noEvent(input: TransactionLineInput, treatmentReason: string, reviewRequired = false): TransactionLineResult {
  return { eligibleBasisCents: 0, excludedCents: cents(input.amountCents), barberAmountCents: 0, shopAmountCents: reviewRequired ? 0 : cents(input.amountCents), tipsCents: 0, effectiveBarberRate: 0, ruleId: input.rule.id, ruleVersion: input.rule.version, transactionType: input.transactionType, createsCommissionEvent: false, adjustmentDirection: "none", reviewRequired, treatmentReason };
}
