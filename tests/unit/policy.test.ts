import test from "node:test";
import assert from "node:assert/strict";
import {
  commissionPolicyMeta,
  lockedCommissionRules,
  policyOpenItems,
  proposedCommissionRules,
} from "../../src/lib/policy/commissionPolicy.ts";

test("policy registry separates locked, proposed, and open owner decisions", () => {
  assert.equal(commissionPolicyMeta.version, "1.0");
  assert.equal(commissionPolicyMeta.effectiveFrom, "2026-01-06");
  assert.ok(lockedCommissionRules.every((rule) => rule.state === "locked"));
  assert.ok(proposedCommissionRules.every((rule) => rule.state === "proposed"));
  assert.ok(policyOpenItems.every((rule) => rule.state === "open"));
});

test("locked defaults include the 70/30 split and immutable calculations", () => {
  const keys = new Set(lockedCommissionRules.map((rule) => rule.key));
  assert.ok(keys.has("shop_client_split"));
  assert.ok(keys.has("barber_client_split"));
  assert.ok(keys.has("immutability"));
});

test("unresolved economic decisions remain open rather than silently activated", () => {
  const keys = new Set(policyOpenItems.map((rule) => rule.key));
  assert.ok(keys.has("structure"));
  assert.ok(keys.has("processing_fees"));
  assert.ok(keys.has("product_commission_rate"));
  assert.ok(keys.has("deposit_schedule"));
});
