import test from "node:test";
import assert from "node:assert/strict";
import { determineAttribution } from "../../src/lib/attribution/engine.ts";

test("locked attribution wins over all later evidence", () => {
  const result = determineAttribution({
    locked: "SHOP",
    approvedOverride: "BARBER",
    verifiedReferralCode: true,
  });
  assert.equal(result.type, "SHOP");
  assert.equal(result.confidence, "locked");
});

test("approved owner override wins before referral evidence", () => {
  const result = determineAttribution({ approvedOverride: "EXCEPTION", verifiedReferralCode: true });
  assert.equal(result.type, "EXCEPTION");
  assert.equal(result.source, "management_override");
});

test("verified personal referral is attributed to the barber", () => {
  const result = determineAttribution({ verifiedReferralCode: true });
  assert.deepEqual(result, {
    type: "BARBER",
    source: "verified_barber_referral_code",
    confidence: "verified",
    reason: "Verified barber referral code.",
  });
});

test("walk-ins default to the shop when no barber evidence exists", () => {
  const result = determineAttribution({ walkIn: true });
  assert.equal(result.type, "SHOP");
  assert.equal(result.source, "walk_in");
});

test("unknown source defaults to shop attribution", () => {
  const result = determineAttribution({});
  assert.equal(result.type, "SHOP");
  assert.equal(result.confidence, "default");
});
