export type AnalyticsEventName =
  | "book_click" | "call_click" | "directions_click" | "queue_start" | "queue_join"
  | "service_view" | "barber_view" | "barber_select" | "booking_start" | "booking_step"
  | "booking_complete" | "booking_error" | "membership_view" | "membership_lead"
  | "gift_card_click" | "lead_submit" | "review_submit" | "rebook" | "referral_use"
  | "ai_open" | "ai_handoff";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lbl:analytics", { detail: { name, payload } }));
}
