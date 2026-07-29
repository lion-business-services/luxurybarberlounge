import test from "node:test";
import assert from "node:assert/strict";
import { calculateCommission, calculateTransactionLine, type CommissionRule } from "../../src/lib/commissions/engine.ts";

const rule: CommissionRule = {
  id: "shop-70-30",
  version: 1,
  barberRate: 0.7,
  shopRate: 0.3,
  tipsToBarber: true,
  includeDiscounts: false,
  includeTaxes: false,
  includeProcessingFees: false,
};

test("shop-generated service uses the configured 70/30 split", () => {
  const result = calculateCommission({
    serviceRevenueCents: 10_000,
    tipsCents: 2_000,
    attribution: "SHOP",
    rule,
  });
  assert.equal(result.eligibleBasisCents, 10_000);
  assert.equal(result.barberAmountCents, 9_000);
  assert.equal(result.shopAmountCents, 3_000);
  assert.equal(result.effectiveBarberRate, 0.7);
});

test("verified barber client receives one hundred percent of eligible service basis", () => {
  const result = calculateCommission({
    serviceRevenueCents: 10_000,
    tipsCents: 1_500,
    attribution: "BARBER",
    rule,
  });
  assert.equal(result.barberAmountCents, 11_500);
  assert.equal(result.shopAmountCents, 0);
  assert.equal(result.effectiveBarberRate, 1);
});

test("refunds and excluded discounts reduce the eligible basis", () => {
  const result = calculateCommission({
    serviceRevenueCents: 10_000,
    refundsCents: 2_000,
    discountsCents: 1_000,
    attribution: "SHOP",
    rule,
  });
  assert.equal(result.eligibleBasisCents, 7_000);
  assert.equal(result.barberAmountCents, 4_900);
  assert.equal(result.shopAmountCents, 2_100);
});

test("negative financial values cannot create negative payouts", () => {
  const result = calculateCommission({
    serviceRevenueCents: -1,
    tipsCents: -500,
    attribution: "SHOP",
    rule,
  });
  assert.equal(result.eligibleBasisCents, 0);
  assert.equal(result.barberAmountCents, 0);
  assert.equal(result.shopAmountCents, 0);
});


test("line-level half-up rounding uses integer basis points", () => {
  const result = calculateCommission({
    serviceRevenueCents: 1,
    attribution: "SHOP",
    rule: { ...rule, barberRate: 0.5, shopRate: 0.5 },
  });
  assert.equal(result.barberAmountCents, 1);
  assert.equal(result.shopAmountCents, 0);
});

test("deposits do not create a commission event", () => {
  const result = calculateTransactionLine({
    transactionType: "deposit",
    amountCents: 5000,
    attribution: "SHOP",
    rule,
    approvedPolicy: {
      processingFeesAbsorbedByShop: false,
      forfeitedFeesToShop: false,
      redemptionValuesApproved: false,
    },
  });
  assert.equal(result.createsCommissionEvent, false);
  assert.equal(result.barberAmountCents, 0);
});

test("unresolved product commission requires owner review", () => {
  const result = calculateTransactionLine({
    transactionType: "retail_product",
    amountCents: 2500,
    attribution: "SHOP",
    rule,
    approvedPolicy: {
      processingFeesAbsorbedByShop: false,
      productCommissionRate: null,
      forfeitedFeesToShop: false,
      redemptionValuesApproved: false,
    },
  });
  assert.equal(result.createsCommissionEvent, false);
  assert.equal(result.reviewRequired, true);
});

test("refund treatment creates a separate negative adjustment", () => {
  const result = calculateTransactionLine({
    transactionType: "refund",
    amountCents: 5000,
    attribution: "SHOP",
    rule,
    approvedPolicy: {
      processingFeesAbsorbedByShop: false,
      forfeitedFeesToShop: false,
      redemptionValuesApproved: false,
    },
  });
  assert.equal(result.createsCommissionEvent, true);
  assert.equal(result.adjustmentDirection, "negative");
  assert.match(result.treatmentReason, /Never edit/);
});
