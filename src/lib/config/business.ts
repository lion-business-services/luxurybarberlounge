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
  minimumLeadMinutes: 60,
  maximumAdvanceDays: 90,
  slotIntervalMinutes: 15,
  defaultBufferMinutes: 10,
  cancellationCutoffHours: 4,
  bookingPolicyVersion: "booking-policy-2026-08-06",
  hours: siteHours,
} as const;

export function absoluteUrl(path: string) {
  return new URL(path, businessConfig.siteUrl).toString();
}
