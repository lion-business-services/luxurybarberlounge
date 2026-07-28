export type AttributionType = "SHOP" | "BARBER" | "EXCEPTION";

export type AttributionInput = {
  locked?: AttributionType;
  approvedOverride?: AttributionType;
  verifiedReferralCode?: boolean;
  verifiedPreExistingBarberClient?: boolean;
  barberImportedClient?: boolean;
  campaignSource?: string | null;
  walkIn?: boolean;
  firstVisit?: boolean;
};

export type AttributionDecision = {
  type: AttributionType;
  source: string;
  confidence: "locked" | "verified" | "inferred" | "default";
  reason: string;
};

/** Deterministic and auditable. AI may explain the decision, never make it. */
export function determineAttribution(input: AttributionInput): AttributionDecision {
  if (input.locked) {
    return { type: input.locked, source: "locked_history", confidence: "locked", reason: "Existing attribution is locked." };
  }
  if (input.approvedOverride) {
    return { type: input.approvedOverride, source: "management_override", confidence: "verified", reason: "Authorized management override." };
  }
  if (input.verifiedReferralCode) {
    return { type: "BARBER", source: "verified_barber_referral_code", confidence: "verified", reason: "Verified barber referral code." };
  }
  if (input.verifiedPreExistingBarberClient || input.barberImportedClient) {
    return { type: "BARBER", source: "verified_pre_existing_relationship", confidence: "verified", reason: "Verified relationship predates the lounge booking." };
  }
  if (input.campaignSource) {
    return { type: "SHOP", source: input.campaignSource, confidence: "verified", reason: "Tracked shop campaign or channel." };
  }
  if (input.walkIn) {
    return { type: "SHOP", source: "walk_in", confidence: "inferred", reason: "Unscheduled traffic is attributed to the location by default." };
  }
  return { type: "SHOP", source: "unknown_default", confidence: "default", reason: "No verified barber-origin evidence was supplied." };
}
