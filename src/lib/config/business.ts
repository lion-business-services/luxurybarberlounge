import { BOOKING_BUFFER_MINUTES, MAXIMUM_ADVANCE_DAYS, MINIMUM_LEAD_MINUTES, SLOT_GRID_MINUTES } from "@/lib/booking/rules";
import { business as siteBusiness, hours as siteHours } from "@/lib/content/site";

export const businessConfig = {
  slug: "luxury-barber-lounge",
  name: siteBusiness.name,
  legalName: siteBusiness.legalName,
  bookingEmail: siteBusiness.email,
  phone: siteBusiness.phone,
  phoneHref: siteBusiness.phoneHref,
  address: {
    line1: siteBusiness.street,
    city: siteBusiness.city,
    region: siteBusiness.state,
    postalCode: siteBusiness.postalCode,
    country: siteBusiness.country,
  },
  timezone: siteBusiness.timezone,
  currency: siteBusiness.currency,
  bookingPath: "/book",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? siteBusiness.domain,
  mapsUrl: siteBusiness.mapsUrl,
  // Scheduling values are defined once in src/lib/booking/rules.ts.
  minimumLeadMinutes: MINIMUM_LEAD_MINUTES,
  maximumAdvanceDays: MAXIMUM_ADVANCE_DAYS,
  slotIntervalMinutes: SLOT_GRID_MINUTES,
  defaultBufferMinutes: BOOKING_BUFFER_MINUTES,
  cancellationCutoffHours: 4,
  bookingPolicyVersion: "booking-policy-2026-10-01",
  hours: siteHours,
} as const;

export function absoluteUrl(path: string) {
  return new URL(path, businessConfig.siteUrl).toString();
}
