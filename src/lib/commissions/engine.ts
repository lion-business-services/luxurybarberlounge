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

export function calculateCommission(input: CommissionInput): CommissionResult {
  const nonNegative = (value = 0) => Math.max(0, Math.round(value));
  const service = nonNegative(input.serviceRevenueCents);
  const discounts = nonNegative(input.discountsCents);
  const refunds = nonNegative(input.refundsCents);
  const taxes = nonNegative(input.taxesCents);
  const fees = nonNegative(input.processingFeesCents);
  const tips = nonNegative(input.tipsCents);

  const eligibleBasisCents = Math.max(
    0,
    service - refunds - (input.rule.includeDiscounts ? 0 : discounts),
  );
  const effectiveBarberRate = input.attribution === "BARBER" ? 1 : input.rule.barberRate;
  const baseBarber = Math.round(eligibleBasisCents * effectiveBarberRate);
  const barberTips = input.rule.tipsToBarber ? tips : 0;
  const barberAmountCents = baseBarber + barberTips;
  const shopAmountCents =
    eligibleBasisCents - baseBarber +
    (input.rule.tipsToBarber ? 0 : tips) +
    (input.rule.includeTaxes ? taxes : 0) -
    (input.rule.includeProcessingFees ? fees : 0);

  return {
    eligibleBasisCents,
    excludedCents: service - eligibleBasisCents + taxes + fees,
    barberAmountCents: Math.max(0, barberAmountCents),
    shopAmountCents: Math.max(0, shopAmountCents),
    tipsCents: tips,
    effectiveBarberRate,
    ruleId: input.rule.id,
    ruleVersion: input.rule.version,
  };
}
