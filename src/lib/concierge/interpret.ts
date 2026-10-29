import "server-only";

import { z } from "zod";
import type { CatalogNames, Understanding } from "@/lib/concierge/understand";

/**
 * Optional: a language model reads the client's message when the local reader
 * might miss an unusual phrasing.
 *
 * The model only names what the client asked for (intent, service, barber,
 * day, time). It never answers, never sees the schedule and never decides a
 * price, a time or a policy: the conversation engine does all of that from
 * the live catalog and the availability engine. Every value it returns is
 * checked against the catalog before use, and any failure or timeout falls
 * back to the local reader.
 *
 * Off unless CONCIERGE_AI_API_KEY is set (an Anthropic API key). Only the
 * client's message is sent; booking contact details never pass through here.
 */

const INTENTS = [
  "book", "availability", "soonest", "services", "price", "duration", "barbers", "hours", "location", "contact",
  "walkins", "payment", "manage", "policy", "membership", "giftcards", "packages", "kids", "senior", "color",
  "languages", "accessibility", "greeting", "thanks", "restart", "human",
] as const;

const resultSchema = z.object({
  intents: z.array(z.enum(INTENTS)).max(6).default([]),
  serviceSlug: z.string().max(80).optional().nullable(),
  barberSlug: z.string().max(80).optional().nullable(),
  firstAvailable: z.boolean().optional().nullable(),
  family: z.boolean().optional().nullable(),
  familyChildren: z.number().int().min(1).max(5).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  partOfDay: z.enum(["morning", "afternoon", "evening"]).optional().nullable(),
});

export function modelInterpreterEnabled() {
  return Boolean(process.env.CONCIERGE_AI_API_KEY);
}

export async function interpretWithModel(message: string, context: { catalog: CatalogNames; today: string; weekday: string }): Promise<Understanding | null> {
  const key = process.env.CONCIERGE_AI_API_KEY;
  if (!key) return null;
  const services = context.catalog.services.map((service) => `${service.slug} (${service.name})`).join(", ");
  const barbers = context.catalog.barbers.map((barber) => `${barber.slug} (${barber.name})`).join(", ");
  const system = [
    "You read one chat message sent to a barbershop's booking assistant and return JSON only, no prose.",
    `Today is ${context.weekday} ${context.today} in America/New_York. The shop opens at 8 AM.`,
    `Keys: intents (array, any of: ${INTENTS.join(", ")}), serviceSlug, barberSlug, firstAvailable, family, familyChildren (1-5), date (YYYY-MM-DD), time (HH:MM, 24 hour), partOfDay (morning, afternoon, evening).`,
    `serviceSlug must be one of: ${services}.`,
    `barberSlug must be one of: ${barbers}.`,
    "family is true only when one adult and kids are booked together. Leave out any key the message does not state. Never guess a barber from a shared last name.",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.CONCIERGE_AI_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 300,
        temperature: 0,
        system,
        messages: [{ role: "user", content: message.slice(0, 600) }],
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const raw = body.content?.find((part) => part.type === "text")?.text ?? "";
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = resultSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const value = parsed.data;
    const serviceSlugs = new Set(context.catalog.services.map((service) => service.slug));
    const barberSlugs = new Set(context.catalog.barbers.map((barber) => barber.slug));
    const result: Understanding = { intents: value.intents };
    if (value.serviceSlug && serviceSlugs.has(value.serviceSlug)) result.serviceSlug = value.serviceSlug;
    if (value.barberSlug && barberSlugs.has(value.barberSlug)) result.barberSlug = value.barberSlug;
    if (value.firstAvailable) result.firstAvailable = true;
    if (value.family) result.family = true;
    if (value.family && value.familyChildren) result.familyChildren = value.familyChildren;
    if (value.date && value.date >= context.today) result.date = value.date;
    if (value.time) result.time = value.time;
    if (value.partOfDay) result.partOfDay = value.partOfDay;
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
