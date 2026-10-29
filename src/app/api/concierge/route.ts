import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { searchSupabaseAvailability } from "@/lib/booking/availability";
import { getBookingCatalog } from "@/lib/booking/catalog";
import { requestCorrelationId } from "@/lib/booking/observability";
import { dateInZone } from "@/lib/booking/timezone";
import { business } from "@/lib/content/site";
import { respond, welcome, welcomeChips } from "@/lib/concierge/engine";
import { interpretWithModel, modelInterpreterEnabled } from "@/lib/concierge/interpret";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

// Answers come from live catalog and schedule records: never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };
const uuid = z.string().uuid();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const choiceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("intent"), intent: z.enum(["book", "availability", "soonest", "services", "price", "duration", "barbers", "hours", "location", "contact", "walkins", "payment", "manage", "policy", "membership", "giftcards", "packages", "kids", "senior", "color", "languages", "accessibility", "greeting", "thanks", "restart", "human"]) }),
  z.object({ type: z.literal("service"), serviceId: uuid }),
  z.object({ type: z.literal("family"), children: z.number().int().min(1).max(5).optional() }),
  z.object({ type: z.literal("barber"), barberId: uuid }),
  z.object({ type: z.literal("any_barber") }),
  z.object({ type: z.literal("date"), date: day }),
  z.object({ type: z.literal("slot"), startsAt: z.string().datetime({ offset: true }), barberId: uuid }),
  z.object({ type: z.literal("all_times"), date: day }),
  z.object({ type: z.literal("change"), step: z.enum(["service", "barber", "date", "time"]) }),
  z.object({ type: z.literal("openings"), barberId: uuid.optional(), serviceId: uuid.optional() }),
  z.object({ type: z.literal("restart") }),
]);

const requestSchema = z.object({
  text: z.string().trim().max(600).optional(),
  choice: choiceSchema.optional(),
  state: z.unknown().optional(),
  language: z.enum(["en", "es"]).default("en"),
  start: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const correlationId = requestCorrelationId(request.headers);
  const limited = rateLimit({ key: `concierge:${requestFingerprint(request.headers)}`, limit: 40, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, message: "One moment, please. Try again in a few seconds." }, { status: 429, headers: NO_STORE });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Please try that again." }, { status: 422, headers: NO_STORE });
  const input = parsed.data;

  try {
    const catalog = await getBookingCatalog();
    const now = new Date();
    if (input.start) {
      return NextResponse.json({ ok: true, blocks: welcome(input.language), chips: welcomeChips(input.language, catalog, now), state: { mode: "idle", draft: {} } }, { headers: NO_STORE });
    }

    const findSlots = async (query: { serviceId: string; familyChildren?: number; barberIds?: string[]; startDate: string; days: number }) => {
      const result = await searchSupabaseAvailability({ locationId: catalog.location.id, serviceId: query.serviceId, addonIds: [], familyChildren: query.familyChildren, barberIds: query.barberIds, startDate: query.startDate, days: query.days });
      return result.slots;
    };

    let interpretation = null;
    if (input.text && !input.choice && modelInterpreterEnabled()) {
      const tz = catalog.location.timezone || business.timezone;
      interpretation = await interpretWithModel(input.text, {
        catalog: { services: catalog.services.map(({ slug, name }) => ({ slug, name })), barbers: catalog.barbers.filter((barber) => !barber.demo).map(({ slug, name }) => ({ slug, name })) },
        today: dateInZone(now, tz),
        weekday: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(now),
      });
    }

    const reply = await respond({ text: input.text, choice: input.choice, state: input.state, language: input.language, now, catalog, findSlots, interpretation });

    // Identifiers and steps only: never the client's words or contact details.
    console.info("concierge", { correlationId, kind: input.choice ? `choice:${input.choice.type}` : "text", awaiting: reply.state.awaiting ?? null, mode: reply.state.mode, offeredBooking: Boolean(reply.booking), model: Boolean(interpretation) });

    return NextResponse.json({ ok: true, ...reply }, { headers: NO_STORE });
  } catch (error) {
    console.error("concierge", { correlationId, code: error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN" });
    const message = input.language === "es"
      ? `No puedo ver la agenda en vivo en este momento. Intenta de nuevo en un momento o llama al ${business.phone}.`
      : `I can't reach the live schedule right now. Please try again in a moment or call ${business.phone}.`;
    return NextResponse.json({ ok: false, message }, { status: 503, headers: NO_STORE });
  }
}
