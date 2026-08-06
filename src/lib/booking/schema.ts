import { z } from "zod";

const phonePattern = /^[+()\-\s.0-9]{7,24}$/;

export const bookingSubmissionSchema = z.object({
  serviceId: z.string().uuid(),
  serviceSlug: z.string().trim().min(1).max(100),
  addonIds: z.array(z.string().uuid()).max(6).default([]),
  barberId: z.string().uuid().nullable(),
  barberSlug: z.string().trim().max(100).nullable(),
  firstAvailable: z.boolean().default(false),
  locationId: z.string().uuid(),
  startsAt: z.string().datetime({ offset: true }),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(phonePattern, "Enter a valid phone number."),
  preferredLanguage: z.enum(["en", "es"]).default("en"),
  existingClient: z.enum(["yes", "no", "unsure"]).default("unsure"),
  notes: z.string().trim().max(1000).default(""),
  emailConsent: z.boolean().default(true),
  smsConsent: z.boolean().default(false),
  policyAccepted: z.literal(true),
  policyVersion: z.string().trim().min(1).max(120),
  idempotencyKey: z.string().uuid(),
  source: z.string().trim().max(80).default("website"),
  campaignSource: z.string().trim().max(120).nullable().default(null),
  campaignMedium: z.string().trim().max(120).nullable().default(null),
  campaignName: z.string().trim().max(120).nullable().default(null),
  referralSource: z.string().trim().max(120).nullable().default(null),
  pageUrl: z.string().url().max(1000),
  company: z.string().max(0).default(""),
});

export type BookingSubmission = z.infer<typeof bookingSubmissionSchema>;

export const availabilityRequestSchema = z.object({
  locationId: z.string().uuid(),
  serviceId: z.string().uuid(),
  addonIds: z.array(z.string().uuid()).max(6).default([]),
  barberIds: z.array(z.string().uuid()).max(20).optional(),
  startDate: z.string().date(),
  days: z.number().int().min(1).max(14).default(7),
});

export const appointmentActionSchema = z.object({
  action: z.enum(["confirm", "decline", "cancel", "check_in", "in_service", "complete", "no_show", "assign", "reschedule", "retry_notification", "note"]),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(2000).optional(),
  barberId: z.string().uuid().optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
});
