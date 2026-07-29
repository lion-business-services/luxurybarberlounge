import test from "node:test";
import assert from "node:assert/strict";
import { determineAttribution, validatePreExistingClaim } from "../../src/lib/attribution/engine.ts";

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
    reason: "Verified personal Barber referral code.",
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


test("verified pre-existing claim requires every documented criterion", () => {
  const eligible = validatePreExistingClaim({
    barberStartDate: "2026-01-06",
    priorServiceDate: "2025-06-15",
    priorServiceWasPaid: true,
    priorServiceOutsideLounge: true,
    evidenceTypes: ["appointment_record"],
    policyLookbackMonths: 24,
    rosterWindowApproved: false,
    submittedAt: "2026-01-10",
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.criteria.documentaryEvidence, true);

  const missingEvidence = validatePreExistingClaim({
    barberStartDate: "2026-01-06",
    priorServiceDate: "2025-06-15",
    priorServiceWasPaid: true,
    priorServiceOutsideLounge: true,
    evidenceTypes: [],
    policyLookbackMonths: 24,
    rosterWindowApproved: false,
    submittedAt: "2026-01-10",
  });
  assert.equal(missingEvidence.eligible, false);
});

test("proposed roster window is not enforced until approved", () => {
  const result = validatePreExistingClaim({
    barberStartDate: "2026-01-06",
    priorServiceDate: "2025-06-15",
    priorServiceWasPaid: true,
    priorServiceOutsideLounge: true,
    evidenceTypes: ["message_history"],
    policyLookbackMonths: 24,
    rosterWindowApproved: false,
    submittedAt: "2026-02-10",
    rosterDeadline: "2026-01-20",
  });
  assert.equal(result.eligible, true);
  assert.equal(result.criteria.withinApprovedWindow, true);
});
