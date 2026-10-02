/**
 * Family bookings: one adult service followed by 1-5 Kids Haircuts with the
 * same barber, reserved, paid, rescheduled and finished as ONE appointment.
 *
 * Prices and durations always come from the live service catalog rows passed
 * in, never from constants, so a price change flows through automatically.
 * Pure and dependency-free (shared by browser, server and tests).
 */

import { BOOKING_BUFFER_MINUTES, MAX_FAMILY_CHILDREN, familyTierSlug } from "./rules.ts";

export type FamilyServiceRef = {
  id: string;
  slug?: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export type FamilyServiceItem = {
  sequence: number;
  role: "adult" | "child";
  label: string;
  serviceId: string;
  serviceSlug: string | null;
  serviceName: string;
  priceCents: number;
  durationMinutes: number;
  /** Minutes after the appointment start at which this family member begins. */
  offsetMinutes: number;
};

export type FamilyComposition = {
  tierSlug: string;
  tierName: string;
  childCount: number;
  partySize: number;
  items: FamilyServiceItem[];
  /** Service minutes plus one changeover gap between consecutive family members. */
  totalDurationMinutes: number;
  totalPriceCents: number;
  /** Stored as the appointment's service name, shown to staff and on receipts. */
  summary: string;
};

export function familyTierName(childCount: number) {
  return `Family ${childCount}`;
}

export function familyTierDescription(childCount: number) {
  return `1 adult + ${childCount} ${childCount === 1 ? "kid" : "kids"}`;
}

export function composeFamilyBooking(input: {
  adult: FamilyServiceRef;
  child: FamilyServiceRef;
  childCount: number;
  bufferMinutes?: number;
}): FamilyComposition {
  const { adult, child, childCount } = input;
  if (!Number.isInteger(childCount) || childCount < 1 || childCount > MAX_FAMILY_CHILDREN) {
    throw new RangeError("FAMILY_CHILD_COUNT_OUT_OF_RANGE");
  }
  if (adult.id === child.id) throw new RangeError("FAMILY_ADULT_SERVICE_MUST_DIFFER_FROM_CHILD_SERVICE");
  for (const service of [adult, child]) {
    if (!Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0) throw new RangeError("FAMILY_SERVICE_DURATION_INVALID");
    if (!Number.isInteger(service.priceCents) || service.priceCents < 0) throw new RangeError("FAMILY_SERVICE_PRICE_INVALID");
  }

  const buffer = input.bufferMinutes ?? BOOKING_BUFFER_MINUTES;
  const items: FamilyServiceItem[] = [];
  let offset = 0;

  const members: Array<{ role: "adult" | "child"; label: string; service: FamilyServiceRef }> = [
    { role: "adult", label: "Adult", service: adult },
    ...Array.from({ length: childCount }, (_, index) => ({ role: "child" as const, label: `Child ${index + 1}`, service: child })),
  ];

  members.forEach((member, index) => {
    if (index > 0) offset += buffer;
    items.push({
      sequence: index + 1,
      role: member.role,
      label: member.label,
      serviceId: member.service.id,
      serviceSlug: member.service.slug ?? null,
      serviceName: member.service.name,
      priceCents: member.service.priceCents,
      durationMinutes: member.service.durationMinutes,
      offsetMinutes: offset,
    });
    offset += member.service.durationMinutes;
  });

  return {
    tierSlug: familyTierSlug(childCount),
    tierName: familyTierName(childCount),
    childCount,
    partySize: childCount + 1,
    items,
    totalDurationMinutes: offset,
    totalPriceCents: adult.priceCents + childCount * child.priceCents,
    summary: `${familyTierName(childCount)}: ${adult.name} + ${childCount} × ${child.name}`,
  };
}
