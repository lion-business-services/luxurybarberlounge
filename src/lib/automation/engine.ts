export type DeliveryDecisionInput = {
  transactional: boolean;
  channel: "email" | "sms" | "in_app";
  consent: { email: boolean; sms: boolean };
  suppressed: boolean;
  now: Date;
  quietHours?: { startHour: number; endHour: number };
};

export type DeliveryDecision = { allowed: boolean; reason: "allowed" | "suppressed" | "missing_consent" | "quiet_hours" };

export function canDeliver(input: DeliveryDecisionInput): DeliveryDecision {
  if (input.suppressed) return { allowed: false, reason: "suppressed" };
  if (!input.transactional) {
    if (input.channel === "email" && !input.consent.email) return { allowed: false, reason: "missing_consent" };
    if (input.channel === "sms" && !input.consent.sms) return { allowed: false, reason: "missing_consent" };
  }
  if (input.quietHours && input.channel !== "in_app") {
    const hour = input.now.getHours();
    const { startHour, endHour } = input.quietHours;
    const quiet = startHour > endHour ? hour >= startHour || hour < endHour : hour >= startHour && hour < endHour;
    if (quiet && !input.transactional) return { allowed: false, reason: "quiet_hours" };
  }
  return { allowed: true, reason: "allowed" };
}
