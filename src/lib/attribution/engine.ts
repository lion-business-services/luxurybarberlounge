export type AttributionType = "SHOP" | "BARBER" | "EXCEPTION";
export type AttributionEvidenceType = "appointment_record" | "pos_record" | "booking_export" | "client_list" | "message_history" | "client_confirmation";

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

export type AttributionDecision = { type: AttributionType; source: string; confidence: "locked" | "verified" | "inferred" | "default"; reason: string };

export function determineAttribution(input: AttributionInput): AttributionDecision {
  if (input.locked) return { type: input.locked, source: "locked_history", confidence: "locked", reason: "Existing client-and-Barber attribution is locked." };
  if (input.approvedOverride) return { type: input.approvedOverride, source: "management_override", confidence: "verified", reason: "Authorized management override with a recorded reason." };
  if (input.verifiedReferralCode) return { type: "BARBER", source: "verified_barber_referral_code", confidence: "verified", reason: "Verified personal Barber referral code." };
  if (input.verifiedPreExistingBarberClient || input.barberImportedClient) return { type: "BARBER", source: "verified_pre_existing_relationship", confidence: "verified", reason: "Approved evidence establishes a relationship predating the lounge." };
  if (input.campaignSource) return { type: "SHOP", source: input.campaignSource, confidence: "verified", reason: "Tracked Shop campaign, location, website, telephone, or referral channel." };
  if (input.walkIn) return { type: "SHOP", source: "walk_in", confidence: "inferred", reason: "Walk-ins are SHOP under the locked policy." };
  return { type: "SHOP", source: "unknown_default", confidence: "default", reason: "No approved Barber-origin evidence was supplied; unresolved pairings default to SHOP." };
}

export function validatePreExistingClaim(input: {
  barberStartDate: string;
  priorServiceDate: string;
  priorServiceWasPaid: boolean;
  priorServiceOutsideLounge: boolean;
  evidenceTypes: AttributionEvidenceType[];
  policyLookbackMonths: number;
  rosterWindowApproved: boolean;
  submittedAt: string;
  rosterDeadline?: string | null;
}) {
  const start = new Date(input.barberStartDate);
  const prior = new Date(input.priorServiceDate);
  const earliest = new Date(start);
  earliest.setMonth(earliest.getMonth() - Math.max(1, input.policyLookbackMonths));
  const evidenceValid = input.evidenceTypes.length > 0;
  const coreEligible = input.priorServiceWasPaid && input.priorServiceOutsideLounge && prior < start && prior >= earliest && evidenceValid;
  const withinRosterWindow = !input.rosterWindowApproved || !input.rosterDeadline || new Date(input.submittedAt) <= new Date(input.rosterDeadline);
  return {
    eligible: coreEligible && withinRosterWindow,
    criteria: { paidPriorService: input.priorServiceWasPaid, occurredBeforeStart: prior < start, withinLookback: prior >= earliest, outsideLounge: input.priorServiceOutsideLounge, documentaryEvidence: evidenceValid, withinApprovedWindow: withinRosterWindow },
    reason: !coreEligible ? "One or more verified pre-existing-client criteria are not satisfied." : !withinRosterWindow ? "The approved roster window has closed; use the late-claim workflow if eligible." : "The claim satisfies the configured evidence criteria and is ready for owner review.",
  };
}
