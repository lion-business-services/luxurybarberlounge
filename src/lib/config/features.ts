function enabled(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "on";
}

/**
 * Public flags default to the safest honest state. The marketing site remains
 * complete, while credential-dependent actions stay hidden or become an
 * inquiry/call flow until their providers are activated.
 */
export const features = {
  liveSquare: enabled(process.env.NEXT_PUBLIC_FEATURE_LIVE_SQUARE),
  squareBookings: enabled(process.env.NEXT_PUBLIC_FEATURE_SQUARE_BOOKINGS),
  walkInQueue: enabled(process.env.NEXT_PUBLIC_FEATURE_WALK_IN_QUEUE),
  kiosk: enabled(process.env.NEXT_PUBLIC_FEATURE_KIOSK),
  memberships: enabled(process.env.NEXT_PUBLIC_FEATURE_MEMBERSHIPS, true),
  membershipBilling: enabled(process.env.NEXT_PUBLIC_FEATURE_MEMBERSHIP_BILLING),
  giftCards: enabled(process.env.NEXT_PUBLIC_FEATURE_GIFT_CARDS),
  loyalty: enabled(process.env.NEXT_PUBLIC_FEATURE_LOYALTY),
  products: enabled(process.env.NEXT_PUBLIC_FEATURE_PRODUCTS),
  aiConcierge: enabled(process.env.NEXT_PUBLIC_FEATURE_AI_CONCIERGE, true),
  aiAdmin: enabled(process.env.NEXT_PUBLIC_FEATURE_AI_ADMIN),
  sms: enabled(process.env.NEXT_PUBLIC_FEATURE_SMS),
  whatsapp: enabled(process.env.NEXT_PUBLIC_FEATURE_WHATSAPP),
  browserNotifications: enabled(process.env.NEXT_PUBLIC_FEATURE_BROWSER_NOTIFICATIONS),
  advancedAnalytics: enabled(process.env.NEXT_PUBLIC_FEATURE_ADVANCED_ANALYTICS),
  multiLocation: enabled(process.env.NEXT_PUBLIC_FEATURE_MULTI_LOCATION),
  eventBooking: enabled(process.env.NEXT_PUBLIC_FEATURE_EVENT_BOOKING, true),
  payoutExport: enabled(process.env.NEXT_PUBLIC_FEATURE_PAYOUT_EXPORT),
  spanish: enabled(process.env.NEXT_PUBLIC_FEATURE_SPANISH, true),
  portalDemoMode: enabled(process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE, process.env.NODE_ENV !== "production"),
  advancedCommission: enabled(process.env.NEXT_PUBLIC_FEATURE_ADVANCED_COMMISSION, true),
  experimental3DHero: enabled(process.env.NEXT_PUBLIC_FEATURE_EXPERIMENTAL_3D_HERO, true),
  squareLiveBooking: enabled(
    process.env.NEXT_PUBLIC_FEATURE_SQUARE_LIVE_BOOKING ?? process.env.NEXT_PUBLIC_FEATURE_SQUARE_BOOKINGS,
  ),
} as const;

export type FeatureKey = keyof typeof features;
