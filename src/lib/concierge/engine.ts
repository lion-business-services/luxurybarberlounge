/**
 * Sterling, the lounge's booking concierge: the conversation engine.
 *
 * Every fact it states comes from one of two places:
 *   - the live booking catalog (services, prices, durations, barbers) and the
 *     one availability engine, passed in by the server route;
 *   - the approved business content in src/lib/content/site.ts.
 * It never invents a time, a price or a policy, and it never decides one: it
 * relays what the catalog and the engine return (CLAUDE.md, rule 5).
 *
 * It does not create bookings either. When the client has picked a real open
 * time, it hands a summary to the chat window, which collects the contact
 * details and books through the same /api/booking/submit route the booking
 * page uses, then opens the same Square checkout.
 *
 * Pure apart from the injected slot finder, so it is unit tested directly.
 */

import { composeFamilyBooking } from "../booking/family.ts";
import { MAXIMUM_ADVANCE_DAYS } from "../booking/rules.ts";
import { addDays, dateInZone, weekdayForDate } from "../booking/timezone.ts";
import type { AvailabilitySlot, BookingCatalog, BookingCatalogBarber, BookingCatalogService } from "../booking/types.ts";
import { business, faqs, giftCards, hours, packages, tiers } from "../content/site.ts";
import { CONCIERGE_NAME } from "./identity.ts";
import { understand, type ConciergeLanguage, type Intent, type PartOfDay, type Understanding } from "./understand.ts";

export { CONCIERGE_NAME };

/** The checkout adds this fee to the service price (see /api/booking/payment-link). */
const SERVICE_FEE_PERCENT = 4;
const CHECKOUT_HOLD_MINUTES = 15;
const SEARCH_DAYS = 14;
const MAX_TIME_CHIPS = 8;
const MAX_DATE_CHIPS = 7;

export type Step = "service" | "family_size" | "adult_service" | "barber" | "date" | "time" | "details";

export type Draft = {
  serviceId?: string;
  /** True when the service was assumed only to look up openings. */
  serviceAssumed?: boolean;
  family?: boolean;
  familyChildren?: number;
  barberId?: string;
  firstAvailable?: boolean;
  date?: string;
  time?: string;
  partOfDay?: PartOfDay;
  startsAt?: string;
  slotBarberId?: string;
  soonest?: boolean;
};

export type ConciergeState = {
  mode: "idle" | "booking";
  awaiting?: Step;
  draft: Draft;
};

export type Choice =
  | { type: "intent"; intent: Intent }
  | { type: "service"; serviceId: string }
  | { type: "family"; children?: number }
  | { type: "barber"; barberId: string }
  | { type: "any_barber" }
  | { type: "date"; date: string }
  | { type: "slot"; startsAt: string; barberId: string }
  | { type: "all_times"; date: string }
  | { type: "change"; step: "service" | "barber" | "date" | "time" }
  | { type: "openings"; barberId?: string; serviceId?: string }
  | { type: "restart" };

export type Block =
  | { kind: "text"; text: string }
  | { kind: "list"; items: Array<{ title: string; detail?: string; meta?: string }> }
  | { kind: "links"; links: Array<{ label: string; href: string }> };

export type Chip = { label: string; choice: Choice; primary?: boolean };

export type BookingSummary = {
  locationId: string;
  timezone: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  familyChildren: number | null;
  familyItems: Array<{ label: string; serviceName: string; minutes: number; priceCents: number }>;
  barberId: string;
  barberSlug: string;
  barberName: string;
  firstAvailable: boolean;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  priceCents: number;
  serviceFeePercent: number;
  holdMinutes: number;
};

export type ConciergeReply = {
  blocks: Block[];
  chips: Chip[];
  state: ConciergeState;
  /** Present when a real open time is chosen: the window collects details and books. */
  booking?: BookingSummary;
};

export type SlotQuery = {
  serviceId: string;
  familyChildren?: number;
  barberIds?: string[];
  startDate: string;
  days: number;
};

export type SlotFinder = (query: SlotQuery) => Promise<AvailabilitySlot[]>;

export type RespondInput = {
  text?: string;
  choice?: Choice;
  /** Whatever the browser sent back; only real catalog ids survive sanitizeState. */
  state?: unknown;
  language: ConciergeLanguage;
  now: Date;
  catalog: BookingCatalog;
  findSlots: SlotFinder;
  /** An interpretation produced elsewhere (an AI model); merged over the local reading. */
  interpretation?: Understanding | null;
};

type Context = {
  lang: ConciergeLanguage;
  tz: string;
  today: string;
  now: Date;
  catalog: BookingCatalog;
  findSlots: SlotFinder;
};

function L(lang: ConciergeLanguage, en: string, es: string) {
  return lang === "es" ? es : en;
}

function money(cents: number) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

function locale(lang: ConciergeLanguage) {
  return lang === "es" ? "es-US" : "en-US";
}

function dayLabel(date: string, ctx: Context, long = false) {
  if (!long && date === ctx.today) return L(ctx.lang, "Today", "Hoy");
  if (!long && date === addDays(ctx.today, 1)) return L(ctx.lang, "Tomorrow", "Mañana");
  return new Intl.DateTimeFormat(locale(ctx.lang), { timeZone: "UTC", weekday: long ? "long" : "short", month: long ? "long" : "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

function clock(iso: string, ctx: Context) {
  return new Intl.DateTimeFormat("en-US", { timeZone: ctx.tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function localMinutes(iso: string, ctx: Context) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: ctx.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

function firstName(name: string) {
  return name.replace(/\(.*?\)/g, "").split(/[\s,]+/)[0] || name;
}

function displayName(barber: BookingCatalogBarber) {
  return barber.name;
}

function text(value: string): Block {
  return { kind: "text", text: value };
}

/* ------------------------------------------------------------------------ */
/* Catalog helpers                                                           */
/* ------------------------------------------------------------------------ */

function bookableServices(ctx: Context) {
  return ctx.catalog.services;
}

function serviceById(ctx: Context, id?: string) {
  return id ? ctx.catalog.services.find((service) => service.id === id) : undefined;
}

function serviceBySlug(ctx: Context, slug?: string) {
  return slug ? ctx.catalog.services.find((service) => service.slug === slug) : undefined;
}

function barberById(ctx: Context, id?: string) {
  return id ? ctx.catalog.barbers.find((barber) => barber.id === id) : undefined;
}

function barberBySlug(ctx: Context, slug?: string) {
  return slug ? ctx.catalog.barbers.find((barber) => barber.slug === slug) : undefined;
}

function kidsService(ctx: Context) {
  const tier = ctx.catalog.family.tiers[0];
  return tier ? serviceById(ctx, tier.childServiceId) : serviceBySlug(ctx, "kids-haircut");
}

function familyAvailable(ctx: Context) {
  return ctx.catalog.family.tiers.length > 0 && Boolean(kidsService(ctx));
}

function defaultService(ctx: Context) {
  return serviceBySlug(ctx, "haircut") ?? ctx.catalog.services[0];
}

function eligibleBarbers(ctx: Context, draft: Draft) {
  const service = serviceById(ctx, draft.serviceId);
  if (!service) return [];
  const required = [service.id];
  if (draft.family) {
    const kids = kidsService(ctx);
    if (kids) required.push(kids.id);
  }
  return ctx.catalog.barbers.filter((barber) => barber.bookable && !barber.demo && required.every((id) => barber.serviceIds.includes(id)));
}

function quote(ctx: Context, draft: Draft) {
  const service = serviceById(ctx, draft.serviceId);
  if (!service) return null;
  if (draft.family && draft.familyChildren) {
    const kids = kidsService(ctx);
    if (!kids) return null;
    const composition = composeFamilyBooking({
      adult: { id: service.id, slug: service.slug, name: service.name, durationMinutes: service.durationMinutes, priceCents: service.priceCents },
      child: { id: kids.id, slug: kids.slug, name: kids.name, durationMinutes: kids.durationMinutes, priceCents: kids.priceCents },
      childCount: draft.familyChildren,
      bufferMinutes: ctx.catalog.family.bufferMinutes,
    });
    return {
      name: composition.summary,
      minutes: composition.totalDurationMinutes,
      cents: composition.totalPriceCents,
      items: composition.items.map((item) => ({ label: item.label, serviceName: item.serviceName, minutes: item.durationMinutes, priceCents: item.priceCents })),
    };
  }
  return { name: service.name, minutes: service.durationMinutes, cents: service.priceCents, items: [] as BookingSummary["familyItems"] };
}

/* ------------------------------------------------------------------------ */
/* State                                                                     */
/* ------------------------------------------------------------------------ */

const STEPS: Step[] = ["service", "family_size", "adult_service", "barber", "date", "time", "details"];

/** The window sends the state back on every turn. Anything that is not a real catalog id is dropped. */
export function sanitizeState(raw: unknown, catalog: BookingCatalog): ConciergeState {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const draftRaw = value.draft && typeof value.draft === "object" ? (value.draft as Record<string, unknown>) : {};
  const str = (key: string) => (typeof draftRaw[key] === "string" ? (draftRaw[key] as string) : undefined);
  const draft: Draft = {};
  const serviceId = str("serviceId");
  if (serviceId && catalog.services.some((service) => service.id === serviceId)) draft.serviceId = serviceId;
  if (draftRaw.serviceAssumed === true && draft.serviceId) draft.serviceAssumed = true;
  if (draftRaw.family === true) draft.family = true;
  const children = draftRaw.familyChildren;
  if (draft.family && typeof children === "number" && Number.isInteger(children) && children >= 1 && children <= 5) draft.familyChildren = children;
  const barberId = str("barberId");
  if (barberId && catalog.barbers.some((barber) => barber.id === barberId)) draft.barberId = barberId;
  if (draftRaw.firstAvailable === true && !draft.barberId) draft.firstAvailable = true;
  const date = str("date");
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) draft.date = date;
  const time = str("time");
  if (time && /^\d{2}:\d{2}$/.test(time)) draft.time = time;
  const part = str("partOfDay");
  if (part === "morning" || part === "afternoon" || part === "evening") draft.partOfDay = part;
  const startsAt = str("startsAt");
  const slotBarberId = str("slotBarberId");
  if (startsAt && !Number.isNaN(Date.parse(startsAt)) && slotBarberId && catalog.barbers.some((barber) => barber.id === slotBarberId)) {
    draft.startsAt = startsAt;
    draft.slotBarberId = slotBarberId;
  }
  if (draftRaw.soonest === true) draft.soonest = true;
  const awaiting = typeof value.awaiting === "string" && (STEPS as string[]).includes(value.awaiting) ? (value.awaiting as Step) : undefined;
  return { mode: value.mode === "booking" ? "booking" : "idle", awaiting, draft };
}

function freshState(): ConciergeState {
  return { mode: "idle", draft: {} };
}

/** Applies what the client said to the booking draft. Returns true if anything changed. */
function applyUnderstanding(ctx: Context, state: ConciergeState, u: Understanding) {
  const draft = state.draft;
  let changed = false;
  const clearTime = () => { delete draft.startsAt; delete draft.slotBarberId; };

  if (u.family && familyAvailable(ctx)) {
    if (!draft.family) { draft.family = true; changed = true; }
    if (u.familyChildren && u.familyChildren !== draft.familyChildren) { draft.familyChildren = u.familyChildren; changed = true; clearTime(); }
    if (draft.serviceId && !serviceById(ctx, draft.serviceId)?.familyAdultEligible) delete draft.serviceId;
  }
  const service = serviceBySlug(ctx, u.serviceSlug);
  if (service && (!draft.family || service.familyAdultEligible) && (service.id !== draft.serviceId || draft.serviceAssumed)) {
    draft.serviceId = service.id;
    delete draft.serviceAssumed;
    changed = true;
    clearTime();
    if (service.slug === kidsService(ctx)?.slug && !u.family) { delete draft.family; delete draft.familyChildren; }
  }
  const barber = barberBySlug(ctx, u.barberSlug);
  if (barber && barber.id !== draft.barberId) {
    draft.barberId = barber.id;
    delete draft.firstAvailable;
    changed = true;
    clearTime();
  } else if (u.firstAvailable && !barber && (draft.barberId || !draft.firstAvailable)) {
    delete draft.barberId;
    draft.firstAvailable = true;
    changed = true;
    clearTime();
  }
  if (u.date && u.date !== draft.date) { draft.date = u.date; changed = true; clearTime(); }
  if (u.time && u.time !== draft.time) { draft.time = u.time; changed = true; clearTime(); }
  if (u.partOfDay && u.partOfDay !== draft.partOfDay) { draft.partOfDay = u.partOfDay; changed = true; clearTime(); }
  if (u.intents.includes("soonest")) {
    if (!draft.soonest) changed = true;
    draft.soonest = true;
    if (!u.date) delete draft.date;
    if (!u.barberSlug && !draft.barberId) draft.firstAvailable = true;
  }
  return changed;
}

/* ------------------------------------------------------------------------ */
/* Booking steps                                                             */
/* ------------------------------------------------------------------------ */

function serviceChips(ctx: Context, family: boolean): Chip[] {
  const list = family ? bookableServices(ctx).filter((service) => service.familyAdultEligible && service.id !== kidsService(ctx)?.id) : bookableServices(ctx);
  const ordered = [...list].sort((a, b) => (a.slug === "haircut" ? -1 : b.slug === "haircut" ? 1 : 0));
  const chips: Chip[] = ordered.map((service) => ({ label: `${service.name} · ${money(service.priceCents)}`, choice: { type: "service", serviceId: service.id } }));
  if (!family && familyAvailable(ctx)) chips.push({ label: L(ctx.lang, "Family (1 adult + kids)", "Familia (1 adulto + niños)"), choice: { type: "family" } });
  return chips;
}

function serviceList(ctx: Context): Block {
  return {
    kind: "list",
    items: bookableServices(ctx).map((service) => ({ title: service.name, detail: service.description, meta: `${service.durationMinutes} min · ${money(service.priceCents)}` })),
  };
}

async function continueBooking(ctx: Context, state: ConciergeState, lead: Block[] = []): Promise<ConciergeReply> {
  const draft = state.draft;
  state.mode = "booking";
  const blocks = [...lead];

  if (draft.family && !familyAvailable(ctx)) {
    delete draft.family;
    delete draft.familyChildren;
    blocks.push(text(L(ctx.lang, "Family bookings are not available online right now, so let's book one appointment.", "Las reservas familiares no están disponibles en línea ahora mismo, así que reservemos una cita.")));
  }

  if (draft.family && !draft.familyChildren) {
    state.awaiting = "family_size";
    blocks.push(text(L(ctx.lang, "A family booking is one appointment: one adult first, then each kid, back to back with the same barber. How many kids are coming?", "Una reserva familiar es una sola cita: primero un adulto y luego cada niño, uno tras otro con el mismo barbero. ¿Cuántos niños vienen?")));
    return { blocks, chips: [1, 2, 3, 4, 5].map((count) => ({ label: L(ctx.lang, `${count} ${count === 1 ? "kid" : "kids"}`, `${count} ${count === 1 ? "niño" : "niños"}`), choice: { type: "family", children: count } })), state };
  }

  if (!draft.serviceId) {
    state.awaiting = draft.family ? "adult_service" : "service";
    blocks.push(text(draft.family
      ? L(ctx.lang, "Which service is the adult getting? Each kid gets a Kids Haircut.", "¿Qué servicio se hace el adulto? Cada niño recibe un Kids Haircut.")
      : L(ctx.lang, "Which service would you like?", "¿Qué servicio te gustaría?")));
    return { blocks, chips: serviceChips(ctx, Boolean(draft.family)), state };
  }

  const service = serviceById(ctx, draft.serviceId)!;
  const eligible = eligibleBarbers(ctx, draft);
  if (!eligible.length) {
    delete draft.serviceId;
    blocks.push(text(L(ctx.lang, `No barber offers ${service.name} online right now. Please choose another service or call ${business.phone}.`, `Ningún barbero ofrece ${service.name} en línea ahora mismo. Elige otro servicio o llama al ${business.phone}.`)));
    state.awaiting = "service";
    return { blocks, chips: serviceChips(ctx, Boolean(draft.family)), state };
  }

  if (draft.barberId && !eligible.some((barber) => barber.id === draft.barberId)) {
    const named = barberById(ctx, draft.barberId);
    delete draft.barberId;
    blocks.push(text(L(ctx.lang, `${named ? displayName(named) : "That barber"} doesn't offer ${service.name} online. These barbers do:`, `${named ? displayName(named) : "Ese barbero"} no ofrece ${service.name} en línea. Estos barberos sí:`)));
  }

  // A client who named a time but no barber cares about the time: the first
  // available barber is used and they can still switch with one tap.
  if (!draft.barberId && !draft.firstAvailable && (draft.soonest || (draft.date && (draft.time || draft.partOfDay)))) {
    draft.firstAvailable = true;
  }

  if (!draft.barberId && !draft.firstAvailable) {
    state.awaiting = "barber";
    const price = quote(ctx, draft);
    const label = price ? `${price.name} (${price.minutes} min, ${money(price.cents)})` : service.name;
    blocks.push(text(L(ctx.lang, `Great, ${label}. Do you have a barber in mind?`, `Perfecto, ${label}. ¿Tienes un barbero en mente?`)));
    const chips: Chip[] = [{ label: L(ctx.lang, "First available", "El primero disponible"), choice: { type: "any_barber" }, primary: true }];
    for (const barber of eligible) chips.push({ label: displayName(barber), choice: { type: "barber", barberId: barber.id } });
    return { blocks, chips, state };
  }

  return chooseTime(ctx, state, blocks);
}

function barberFilter(draft: Draft) {
  return draft.barberId ? [draft.barberId] : undefined;
}

function partWindow(part: PartOfDay) {
  if (part === "morning") return [0, 12 * 60] as const;
  if (part === "afternoon") return [12 * 60, 17 * 60] as const;
  return [17 * 60, 24 * 60] as const;
}

function uniqueTimes(slots: AvailabilitySlot[]) {
  const seen = new Set<string>();
  return slots
    .slice()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .filter((slot) => {
      if (seen.has(slot.startsAt)) return false;
      seen.add(slot.startsAt);
      return true;
    });
}

function slotChip(ctx: Context, slot: AvailabilitySlot, draft: Draft, withDay = false): Chip {
  const who = draft.barberId ? "" : ` · ${firstName(slot.barberName)}`;
  const day = withDay ? `${dayLabel(dateInZone(new Date(slot.startsAt), ctx.tz), ctx)} ` : "";
  return { label: `${day}${clock(slot.startsAt, ctx)}${who}`, choice: { type: "slot", startsAt: slot.startsAt, barberId: slot.barberId } };
}

function withWho(ctx: Context, draft: Draft) {
  const barber = barberById(ctx, draft.barberId);
  return barber ? L(ctx.lang, ` with ${displayName(barber)}`, ` con ${displayName(barber)}`) : "";
}

async function search(ctx: Context, draft: Draft, startDate: string, days: number) {
  return ctx.findSlots({
    serviceId: draft.serviceId!,
    familyChildren: draft.family ? draft.familyChildren : undefined,
    barberIds: barberFilter(draft),
    startDate,
    days,
  });
}

function changeChips(ctx: Context, draft: Draft): Chip[] {
  const chips: Chip[] = [];
  if (draft.serviceAssumed) chips.push({ label: L(ctx.lang, "Different service", "Otro servicio"), choice: { type: "change", step: "service" } });
  chips.push({ label: draft.barberId ? L(ctx.lang, "Any barber", "Cualquier barbero") : L(ctx.lang, "Choose a barber", "Elegir barbero"), choice: draft.barberId ? { type: "any_barber" } : { type: "change", step: "barber" } });
  return chips;
}

async function chooseTime(ctx: Context, state: ConciergeState, blocks: Block[]): Promise<ConciergeReply> {
  const draft = state.draft;
  const service = serviceById(ctx, draft.serviceId)!;
  const what = quote(ctx, draft)?.name ?? service.name;
  const assumed = draft.serviceAssumed ? L(ctx.lang, ` (for a ${service.name}, ${service.durationMinutes} min)`, ` (para un ${service.name}, ${service.durationMinutes} min)`) : "";
  const lastDay = addDays(ctx.today, MAXIMUM_ADVANCE_DAYS);

  // A chosen time is checked again against the live schedule before details are taken.
  if (draft.startsAt && draft.slotBarberId) {
    const day = dateInZone(new Date(draft.startsAt), ctx.tz);
    const slots = await ctx.findSlots({ serviceId: draft.serviceId!, familyChildren: draft.family ? draft.familyChildren : undefined, barberIds: [draft.slotBarberId], startDate: day, days: 1 });
    const slot = slots.find((item) => item.startsAt === draft.startsAt && item.barberId === draft.slotBarberId);
    if (slot) return readyForDetails(ctx, state, blocks, slot);
    delete draft.startsAt;
    delete draft.slotBarberId;
    draft.date = day;
    blocks.push(text(L(ctx.lang, "That time was just taken. Here is what is still open:", "Esa hora se acaba de ocupar. Esto es lo que sigue disponible:")));
  }

  if (draft.date && draft.date < ctx.today) {
    blocks.push(text(L(ctx.lang, "That date has already passed.", "Esa fecha ya pasó.")));
    delete draft.date;
  }
  if (draft.date && draft.date > lastDay) {
    blocks.push(text(L(ctx.lang, `Online booking opens ${MAXIMUM_ADVANCE_DAYS} days ahead. For a later date, call ${business.phone}.`, `Las reservas en línea abren con ${MAXIMUM_ADVANCE_DAYS} días de anticipación. Para una fecha posterior, llama al ${business.phone}.`)));
    delete draft.date;
  }

  if (draft.date && !draft.soonest) {
    const slots = uniqueTimes(await search(ctx, draft, draft.date, 1));
    if (!slots.length) {
      const closed = hours.find((day) => day.weekday === weekdayForDate(draft.date!))?.closed;
      blocks.push(text(closed
        ? L(ctx.lang, `The lounge is closed on ${dayLabel(draft.date, ctx, true)}.`, `La barbería está cerrada el ${dayLabel(draft.date, ctx, true)}.`)
        : L(ctx.lang, `There are no openings${withWho(ctx, draft)} on ${dayLabel(draft.date, ctx, true)} for ${what}.`, `No hay horarios${withWho(ctx, draft)} el ${dayLabel(draft.date, ctx, true)} para ${what}.`)));
      const requested = draft.date;
      delete draft.date;
      return chooseDate(ctx, state, blocks, requested > ctx.today ? requested : ctx.today);
    }
    let shown = slots;
    let exact: AvailabilitySlot | undefined;
    if (draft.time) {
      const target = Number(draft.time.slice(0, 2)) * 60 + Number(draft.time.slice(3, 5));
      exact = slots.find((slot) => localMinutes(slot.startsAt, ctx) === target);
      if (exact) return readyForDetails(ctx, state, blocks, exact);
      shown = slots.slice().sort((a, b) => Math.abs(localMinutes(a.startsAt, ctx) - target) - Math.abs(localMinutes(b.startsAt, ctx) - target)).slice(0, MAX_TIME_CHIPS).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const wanted = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(new Date(`2026-01-01T${draft.time}:00Z`));
      blocks.push(text(L(ctx.lang, `${wanted} isn't open${withWho(ctx, draft)} on ${dayLabel(draft.date, ctx)}. The closest times are:`, `${wanted} no está disponible${withWho(ctx, draft)} el ${dayLabel(draft.date, ctx)}. Los horarios más cercanos son:`)));
    } else if (draft.partOfDay) {
      const [from, to] = partWindow(draft.partOfDay);
      const inWindow = slots.filter((slot) => { const minute = localMinutes(slot.startsAt, ctx); return minute >= from && minute < to; });
      if (inWindow.length) {
        shown = inWindow.slice(0, MAX_TIME_CHIPS);
        blocks.push(text(L(ctx.lang, `Open times${withWho(ctx, draft)} on ${dayLabel(draft.date, ctx)}${assumed}:`, `Horarios disponibles${withWho(ctx, draft)} el ${dayLabel(draft.date, ctx)}${assumed}:`)));
      } else {
        shown = slots.slice(0, MAX_TIME_CHIPS);
        blocks.push(text(L(ctx.lang, `Nothing is open in that part of the day, but these times are${withWho(ctx, draft)} on ${dayLabel(draft.date, ctx)}:`, `No hay nada en ese momento del día, pero estos horarios sí${withWho(ctx, draft)} el ${dayLabel(draft.date, ctx)}:`)));
      }
    } else {
      shown = slots.slice(0, MAX_TIME_CHIPS);
      blocks.push(text(L(ctx.lang, `${slots.length} open ${slots.length === 1 ? "time" : "times"}${withWho(ctx, draft)} on ${dayLabel(draft.date, ctx, true)}${assumed}. Pick one:`, `${slots.length} ${slots.length === 1 ? "horario disponible" : "horarios disponibles"}${withWho(ctx, draft)} el ${dayLabel(draft.date, ctx, true)}${assumed}. Elige uno:`)));
    }
    state.awaiting = "time";
    const chips = shown.map((slot) => slotChip(ctx, slot, draft));
    if (slots.length > shown.length) chips.push({ label: L(ctx.lang, `All ${slots.length} times`, `Los ${slots.length} horarios`), choice: { type: "all_times", date: draft.date } });
    chips.push({ label: L(ctx.lang, "Another day", "Otro día"), choice: { type: "change", step: "date" } });
    chips.push(...changeChips(ctx, draft));
    return { blocks, chips, state };
  }

  return chooseDate(ctx, state, blocks, ctx.today);
}

async function chooseDate(ctx: Context, state: ConciergeState, blocks: Block[], from: string): Promise<ConciergeReply> {
  const draft = state.draft;
  const service = serviceById(ctx, draft.serviceId)!;
  const what = quote(ctx, draft)?.name ?? service.name;
  const assumed = draft.serviceAssumed ? L(ctx.lang, ` for a ${service.name} (${service.durationMinutes} min)`, ` para un ${service.name} (${service.durationMinutes} min)`) : "";
  const slots = uniqueTimes(await search(ctx, draft, from, SEARCH_DAYS));
  if (!slots.length) {
    state.awaiting = "date";
    blocks.push(text(L(ctx.lang, `I don't see any online openings${withWho(ctx, draft)} for ${what} in the next ${SEARCH_DAYS} days. Call ${business.phone} and the team will help.`, `No veo horarios en línea${withWho(ctx, draft)} para ${what} en los próximos ${SEARCH_DAYS} días. Llama al ${business.phone} y el equipo te ayudará.`)));
    return { blocks, chips: changeChips(ctx, draft), state };
  }

  if (draft.soonest) {
    delete draft.soonest;
    state.awaiting = "time";
    blocks.push(text(L(ctx.lang, `The earliest openings${withWho(ctx, draft)}${assumed}:`, `Los horarios más próximos${withWho(ctx, draft)}${assumed}:`)));
    const chips = slots.slice(0, MAX_TIME_CHIPS).map((slot) => slotChip(ctx, slot, draft, true));
    chips.push({ label: L(ctx.lang, "Pick a day", "Elegir día"), choice: { type: "change", step: "date" } }, ...changeChips(ctx, draft));
    return { blocks, chips, state };
  }

  const byDay = new Map<string, number>();
  for (const slot of slots) {
    const day = dateInZone(new Date(slot.startsAt), ctx.tz);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, MAX_DATE_CHIPS);
  state.awaiting = "date";
  const first = slots[0];
  blocks.push(text(L(ctx.lang, `Which day works${assumed}? The next opening${withWho(ctx, draft)} is ${dayLabel(dateInZone(new Date(first.startsAt), ctx.tz), ctx)} at ${clock(first.startsAt, ctx)}.`, `¿Qué día te funciona${assumed}? El próximo horario${withWho(ctx, draft)} es ${dayLabel(dateInZone(new Date(first.startsAt), ctx.tz), ctx).toLowerCase()} a las ${clock(first.startsAt, ctx)}.`)));
  const chips: Chip[] = days.map(([day, count]) => ({ label: L(ctx.lang, `${dayLabel(day, ctx)} · ${count} ${count === 1 ? "time" : "times"}`, `${dayLabel(day, ctx)} · ${count} ${count === 1 ? "horario" : "horarios"}`), choice: { type: "date", date: day } }));
  chips.unshift({ label: L(ctx.lang, `Earliest: ${clock(first.startsAt, ctx)} ${dayLabel(dateInZone(new Date(first.startsAt), ctx.tz), ctx)}`, `Primero: ${dayLabel(dateInZone(new Date(first.startsAt), ctx.tz), ctx)} ${clock(first.startsAt, ctx)}`), choice: { type: "slot", startsAt: first.startsAt, barberId: first.barberId }, primary: true });
  chips.push(...changeChips(ctx, draft));
  return { blocks, chips, state };
}

function readyForDetails(ctx: Context, state: ConciergeState, blocks: Block[], slot: AvailabilitySlot): ConciergeReply {
  const draft = state.draft;
  const service = serviceById(ctx, draft.serviceId)!;
  const barber = barberById(ctx, slot.barberId);
  const price = quote(ctx, draft)!;
  draft.startsAt = slot.startsAt;
  draft.slotBarberId = slot.barberId;
  draft.date = dateInZone(new Date(slot.startsAt), ctx.tz);
  state.awaiting = "details";
  blocks.push(text(L(
    ctx.lang,
    `${dayLabel(draft.date, ctx, true)} at ${clock(slot.startsAt, ctx)} with ${barber ? displayName(barber) : slot.barberName} is open. Add your details below and I'll reserve it.`,
    `${dayLabel(draft.date, ctx, true)} a las ${clock(slot.startsAt, ctx)} con ${barber ? displayName(barber) : slot.barberName} está disponible. Agrega tus datos abajo y la reservo.`,
  )));
  return {
    blocks,
    chips: [
      { label: L(ctx.lang, "Change time", "Cambiar hora"), choice: { type: "change", step: "time" } },
      { label: L(ctx.lang, "Change barber", "Cambiar barbero"), choice: { type: "change", step: "barber" } },
    ],
    state,
    booking: {
      locationId: ctx.catalog.location.id,
      timezone: ctx.tz,
      serviceId: service.id,
      serviceSlug: service.slug,
      serviceName: price.name,
      familyChildren: draft.family && draft.familyChildren ? draft.familyChildren : null,
      familyItems: price.items,
      barberId: slot.barberId,
      barberSlug: barber?.slug ?? "",
      barberName: barber ? displayName(barber) : slot.barberName,
      firstAvailable: Boolean(draft.firstAvailable),
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      durationMinutes: slot.durationMinutes,
      priceCents: price.cents,
      serviceFeePercent: SERVICE_FEE_PERCENT,
      holdMinutes: CHECKOUT_HOLD_MINUTES,
    },
  };
}

/* ------------------------------------------------------------------------ */
/* Answers                                                                   */
/* ------------------------------------------------------------------------ */

function mainChips(ctx: Context): Chip[] {
  return [
    { label: L(ctx.lang, "Book an appointment", "Reservar una cita"), choice: { type: "intent", intent: "book" }, primary: true },
    { label: L(ctx.lang, "Next available", "Próximo disponible"), choice: { type: "intent", intent: "soonest" } },
    { label: L(ctx.lang, "Services & prices", "Servicios y precios"), choice: { type: "intent", intent: "services" } },
    { label: L(ctx.lang, "Our barbers", "Nuestros barberos"), choice: { type: "intent", intent: "barbers" } },
    { label: L(ctx.lang, "Hours & location", "Horario y ubicación"), choice: { type: "intent", intent: "hours" } },
  ];
}

export function welcome(lang: ConciergeLanguage): Block[] {
  return [text(lang === "es"
    ? `Hola, soy ${CONCIERGE_NAME}, el concierge de Luxury Barber Lounge. Puedo reservar tu cita aquí mismo con horarios en vivo, o responder sobre servicios, precios, barberos y horario.`
    : `Hi, I'm ${CONCIERGE_NAME}, the Luxury Barber Lounge concierge. I can book your appointment right here with live times, or answer anything about services, prices, barbers and hours.`)];
}

export function welcomeChips(lang: ConciergeLanguage, catalog: BookingCatalog, now: Date): Chip[] {
  return mainChips(contextFor(lang, catalog, now, async () => []));
}

function hoursBlock(ctx: Context): Block {
  const fmt = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: value.endsWith(":00") ? undefined : "2-digit" }).format(new Date(`2026-01-01T${value}:00Z`));
  return {
    kind: "list",
    items: [...hours.slice(1), hours[0]].map((day) => ({ title: day.day[ctx.lang], meta: day.closed ? L(ctx.lang, "Closed", "Cerrado") : `${fmt(day.open)} – ${fmt(day.close)}` })),
  };
}

function faqAnswer(lang: ConciergeLanguage, startsWith: string) {
  return faqs.find((faq) => faq.question.en.toLowerCase().startsWith(startsWith.toLowerCase()))?.answer[lang];
}

function languageName(code: string, lang: ConciergeLanguage) {
  if (code === "es") return L(lang, "Spanish", "Español");
  if (code === "en") return L(lang, "English", "Inglés");
  return code;
}

function barberCard(ctx: Context, barber: BookingCatalogBarber): Block {
  const offered = ctx.catalog.services.filter((service) => barber.serviceIds.includes(service.id)).map((service) => service.name);
  const items: Array<{ title: string; detail?: string; meta?: string }> = [{ title: displayName(barber), detail: barber.biography, meta: barber.title }];
  if (barber.specialties.length) items.push({ title: L(ctx.lang, "Specialties", "Especialidades"), detail: barber.specialties.join(", ") });
  if (barber.languages.length) items.push({ title: L(ctx.lang, "Languages", "Idiomas"), detail: barber.languages.map((code) => languageName(code, ctx.lang)).join(", ") });
  if (offered.length) items.push({ title: L(ctx.lang, "Services", "Servicios"), detail: offered.join(", ") });
  return { kind: "list", items };
}

/** Answers one informational intent. Returns null when the intent needs the booking flow instead. */
function answerIntent(ctx: Context, intent: Intent, u: Understanding): { blocks: Block[]; chips: Chip[] } | null {
  const lang = ctx.lang;
  const service = serviceBySlug(ctx, u.serviceSlug);
  const barber = barberBySlug(ctx, u.barberSlug);
  const bookChip = (label?: string, serviceId?: string): Chip => ({ label: label ?? L(lang, "Book now", "Reservar"), choice: serviceId ? { type: "service", serviceId } : { type: "intent", intent: "book" }, primary: true });

  switch (intent) {
    case "services":
    case "price":
    case "duration": {
      if (service) {
        return {
          blocks: [text(`${service.name}: ${service.durationMinutes} min, ${money(service.priceCents)}. ${service.description}`)],
          chips: [bookChip(L(lang, `Book ${service.name}`, `Reservar ${service.name}`), service.id), { label: L(lang, "See openings", "Ver horarios"), choice: { type: "openings", serviceId: service.id } }, { label: L(lang, "All services", "Todos los servicios"), choice: { type: "intent", intent: "services" } }],
        };
      }
      const kids = kidsService(ctx);
      const familyLine = familyAvailable(ctx) && kids
        ? L(lang, ` Family bookings (1 adult + 1 to 5 kids) are one appointment: the adult's service plus ${money(kids.priceCents)} per Kids Haircut.`, ` Las reservas familiares (1 adulto + 1 a 5 niños) son una sola cita: el servicio del adulto más ${money(kids.priceCents)} por cada Kids Haircut.`)
        : "";
      return {
        blocks: [text(L(lang, `Here is the menu, with live prices and times.${familyLine}`, `Este es el menú, con precios y tiempos al día.${familyLine}`)), serviceList(ctx)],
        chips: [bookChip(), ...bookableServices(ctx).slice(0, 4).map((item) => ({ label: L(lang, `Book ${item.name}`, `Reservar ${item.name}`), choice: { type: "service", serviceId: item.id } as Choice }))],
      };
    }
    case "barbers": {
      if (barber) {
        return {
          blocks: [barberCard(ctx, barber)],
          chips: [
            { label: L(lang, `Book with ${firstName(barber.name)}`, `Reservar con ${firstName(barber.name)}`), choice: { type: "barber", barberId: barber.id }, primary: true },
            { label: L(lang, `${firstName(barber.name)}'s openings`, `Horarios de ${firstName(barber.name)}`), choice: { type: "openings", barberId: barber.id } },
            { label: L(lang, "All barbers", "Todos los barberos"), choice: { type: "intent", intent: "barbers" } },
          ],
        };
      }
      const team = ctx.catalog.barbers.filter((item) => item.bookable && !item.demo);
      return {
        blocks: [text(L(lang, `Meet the team. Tap a name to book with them or see their openings.`, `Conoce al equipo. Toca un nombre para reservar o ver sus horarios.`)), { kind: "list", items: team.map((item) => ({ title: displayName(item), detail: item.specialties.join(", "), meta: [item.title, item.languages.map((code) => languageName(code, lang)).join(" / ")].filter(Boolean).join(" · ") })) }],
        chips: team.map((item) => ({ label: displayName(item), choice: { type: "barber", barberId: item.id } as Choice })),
      };
    }
    case "hours":
      return { blocks: [text(L(lang, "Our hours (Eastern time):", "Nuestro horario (hora del Este):")), hoursBlock(ctx), text(L(lang, `${business.street}, ${business.city}, ${business.state} ${business.postalCode}. ${business.parking.en}`, `${business.street}, ${business.city}, ${business.state} ${business.postalCode}. ${business.parking.es}`))], chips: [bookChip(), { label: L(lang, "Directions", "Cómo llegar"), choice: { type: "intent", intent: "location" } }] };
    case "location":
      return { blocks: [text(L(lang, `We're at ${business.street}, ${business.city}, ${business.state} ${business.postalCode}. ${business.parking.en}`, `Estamos en ${business.street}, ${business.city}, ${business.state} ${business.postalCode}. ${business.parking.es}`)), { kind: "links", links: [{ label: L(lang, "Open in Google Maps", "Abrir en Google Maps"), href: business.mapsUrl }, { label: L(lang, "Visit page", "Página de visita"), href: "/visit" }] }], chips: [bookChip(), { label: L(lang, "Hours", "Horario"), choice: { type: "intent", intent: "hours" } }] };
    case "contact":
    case "human":
      return { blocks: [text(L(lang, `You can reach the team at ${business.phone} or ${business.email}. I can also book you right here.`, `Puedes comunicarte con el equipo al ${business.phone} o ${business.email}. También puedo reservarte aquí mismo.`)), { kind: "links", links: [{ label: L(lang, `Call ${business.phone}`, `Llamar al ${business.phone}`), href: business.phoneHref }, { label: L(lang, "Contact page", "Página de contacto"), href: "/contact" }] }], chips: [bookChip()] };
    case "walkins":
      return { blocks: [text(faqAnswer(lang, "Do you accept walk-ins") ?? ""), text(L(lang, "Booking ahead guarantees your time with the barber you want.", "Reservar con anticipación te asegura tu hora con el barbero que quieres."))], chips: [bookChip(), { label: L(lang, "Next available", "Próximo disponible"), choice: { type: "intent", intent: "soonest" } }] };
    case "payment":
      return {
        blocks: [text(L(
          lang,
          `Online bookings are confirmed with full payment by card through Square. A ${SERVICE_FEE_PERCENT}% service fee is added at checkout, and nothing more is due at the chair. While you pay, your time is held for ${CHECKOUT_HOLD_MINUTES} minutes. Discount codes can't be used on online bookings.`,
          `Las reservas en línea se confirman con el pago completo con tarjeta a través de Square. Se agrega un cargo por servicio de ${SERVICE_FEE_PERCENT}% al pagar y no se debe nada más en la silla. Mientras pagas, tu hora queda apartada por ${CHECKOUT_HOLD_MINUTES} minutos. Los códigos de descuento no se pueden usar en reservas en línea.`,
        ))],
        chips: [bookChip(), { label: L(lang, "Policies", "Políticas"), choice: { type: "intent", intent: "policy" } }],
      };
    case "policy":
      return { blocks: [text(L(lang, "The booking, cancellation, no-show and refund terms are on our policies page, and you'll see them before you pay.", "Los términos de reserva, cancelación, inasistencia y reembolso están en nuestra página de políticas, y los verás antes de pagar.")), { kind: "links", links: [{ label: L(lang, "Policies", "Políticas"), href: "/policies" }] }], chips: [bookChip()] };
    case "manage":
      return {
        blocks: [text(L(lang, `To change or cancel, use the Manage appointment link in your confirmation email, or sign in to your client portal. For anything same-day, call ${business.phone}.`, `Para cambiar o cancelar, usa el enlace Manage appointment de tu correo de confirmación, o entra a tu portal de cliente. Para algo del mismo día, llama al ${business.phone}.`)), { kind: "links", links: [{ label: L(lang, "Client portal", "Portal de cliente"), href: "/login?next=/client/appointments" }, { label: L(lang, `Call ${business.phone}`, `Llamar al ${business.phone}`), href: business.phoneHref }] }],
        chips: [{ label: L(lang, "Book a new appointment", "Reservar una nueva cita"), choice: { type: "intent", intent: "book" } }],
      };
    case "membership":
      return { blocks: [text(L(lang, "Membership plans:", "Planes de membresía:")), { kind: "list", items: tiers.map((tier) => ({ title: tier.name[lang], detail: tier.perks.map((perk) => perk[lang]).join(", "), meta: `$${tier.price.toLocaleString("en-US")} · ${tier.cadence[lang]}` })) }, { kind: "links", links: [{ label: L(lang, "Membership details", "Detalles de membresía"), href: "/membership" }] }], chips: [bookChip()] };
    case "giftcards":
      return { blocks: [text(L(lang, `Gift cards are available, starting at $${giftCards.startingAmount}.`, `Hay tarjetas de regalo disponibles, desde $${giftCards.startingAmount}.`)), { kind: "links", links: [{ label: L(lang, "Gift cards", "Tarjetas de regalo"), href: "/gift-cards" }] }], chips: [bookChip()] };
    case "packages":
      return { blocks: [text(L(lang, `These packages are arranged directly with the lounge. Call ${business.phone} to plan one.`, `Estos paquetes se coordinan directamente con la barbería. Llama al ${business.phone} para planearlo.`)), { kind: "list", items: packages.map((item) => ({ title: item.name[lang], detail: item.description[lang], meta: L(lang, `from $${item.from}`, `desde $${item.from}`) })) }, { kind: "links", links: [{ label: L(lang, "Packages", "Paquetes"), href: "/packages" }] }], chips: [bookChip()] };
    case "kids": {
      const kids = kidsService(ctx);
      return { blocks: [text([faqAnswer(lang, "What is the kids price"), kids ? `${kids.name}: ${kids.durationMinutes} min, ${money(kids.priceCents)}.` : ""].filter(Boolean).join(" "))], chips: [kids ? bookChip(L(lang, `Book ${kids.name}`, `Reservar ${kids.name}`), kids.id) : bookChip(), ...(familyAvailable(ctx) ? [{ label: L(lang, "Family booking", "Reserva familiar"), choice: { type: "family" } as Choice }] : [])] };
    }
    case "senior": {
      const senior = serviceBySlug(ctx, "senior-haircut");
      return { blocks: [text([faqAnswer(lang, "What is the senior price"), senior ? `${senior.name}: ${senior.durationMinutes} min, ${money(senior.priceCents)}.` : ""].filter(Boolean).join(" "))], chips: [senior ? bookChip(L(lang, `Book ${senior.name}`, `Reservar ${senior.name}`), senior.id) : bookChip()] };
    }
    case "color":
      return { blocks: [text(faqAnswer(lang, "Is hair color available") ?? "")], chips: [{ label: L(lang, "Services & prices", "Servicios y precios"), choice: { type: "intent", intent: "services" } }] };
    case "languages": {
      const spanish = ctx.catalog.barbers.filter((item) => item.bookable && item.languages.includes("es")).map((item) => displayName(item));
      return { blocks: [text(spanish.length ? L(lang, `Yes. These barbers speak Spanish: ${spanish.join(", ")}.`, `Sí. Estos barberos hablan español: ${spanish.join(", ")}.`) : L(lang, `Call ${business.phone} to ask about languages.`, `Llama al ${business.phone} para preguntar por idiomas.`))], chips: [bookChip()] };
    }
    case "accessibility": {
      const sensory = ctx.catalog.barbers.filter((item) => item.bookable && item.specialties.some((specialty) => /sensory|special|autism/i.test(specialty)));
      const extra = sensory.length ? L(lang, ` ${sensory.map((item) => displayName(item)).join(", ")} offers sensory-inclusive and special-needs haircuts.`, ` ${sensory.map((item) => displayName(item)).join(", ")} ofrece cortes inclusivos para necesidades sensoriales y especiales.`) : "";
      return { blocks: [text(`${business.accessibility[lang]}${extra}`)], chips: [bookChip()] };
    }
    case "greeting":
      return { blocks: welcome(lang), chips: mainChips(ctx) };
    case "thanks":
      return { blocks: [text(L(lang, "My pleasure. Anything else I can help with?", "Con gusto. ¿Te ayudo con algo más?"))], chips: mainChips(ctx) };
    default:
      return null;
  }
}

const INFO_PRIORITY: Intent[] = ["manage", "human", "contact", "payment", "policy", "walkins", "hours", "location", "price", "duration", "services", "barbers", "membership", "giftcards", "packages", "kids", "senior", "color", "languages", "accessibility"];

function contextFor(lang: ConciergeLanguage, catalog: BookingCatalog, now: Date, findSlots: SlotFinder): Context {
  const tz = catalog.location.timezone || business.timezone;
  return { lang, tz, today: dateInZone(now, tz), now, catalog, findSlots };
}

function mergeUnderstanding(local: Understanding, ai?: Understanding | null): Understanding {
  if (!ai) return local;
  return {
    ...local,
    ...Object.fromEntries(Object.entries(ai).filter(([, value]) => value !== undefined && value !== null)),
    intents: [...new Set([...(ai.intents ?? []), ...local.intents])],
  };
}

function catalogNames(catalog: BookingCatalog) {
  return { services: catalog.services.map(({ slug, name }) => ({ slug, name })), barbers: catalog.barbers.filter((barber) => !barber.demo).map(({ slug, name }) => ({ slug, name })) };
}

export async function respond(input: RespondInput): Promise<ConciergeReply> {
  const ctx = contextFor(input.language, input.catalog, input.now, input.findSlots);
  let state = sanitizeState(input.state, input.catalog);
  const lang = ctx.lang;

  if (input.choice) return respondToChoice(ctx, state, input.choice);

  const message = (input.text ?? "").trim();
  if (!message) return { blocks: welcome(lang), chips: mainChips(ctx), state };

  const u = mergeUnderstanding(understand(message, { catalog: catalogNames(input.catalog), today: ctx.today }), input.interpretation);

  if (u.intents.includes("restart")) {
    state = freshState();
    return { blocks: [text(L(lang, "Fresh start. What can I do for you?", "Empecemos de nuevo. ¿En qué te ayudo?"))], chips: mainChips(ctx), state };
  }

  // Changing or cancelling an existing booking is never mistaken for a new one.
  if (u.intents.includes("manage")) return withState(answerIntent(ctx, "manage", u)!, state);

  const infoIntent = INFO_PRIORITY.find((intent) => u.intents.includes(intent));
  // "Is hair color available?" is a question about color, not a request for times.
  const topical = infoIntent && !["price", "duration", "services", "barbers"].includes(infoIntent);
  const bookingWords = u.intents.includes("book") || u.intents.includes("soonest") || (u.intents.includes("availability") && !topical);

  if (state.mode === "booking") {
    // A bare reply to the question just asked: "2" for kids, "yes" to first available.
    if (state.awaiting === "family_size" && !u.familyChildren) {
      const count = Number(message.match(/\b([1-5])\b/)?.[1] ?? 0);
      if (count) u.familyChildren = count;
      if (count) u.family = true;
    }
    // A question in the middle of a booking ("what time do you close on
    // Sunday?", "how much is a fade?") is answered without changing the booking.
    if (!infoIntent || bookingWords) {
      const changed = applyUnderstanding(ctx, state, u);
      if (changed || bookingWords) {
        const lead = topical ? answerIntent(ctx, infoIntent, u)?.blocks ?? [] : [];
        return continueBooking(ctx, state, lead);
      }
    }
    if (infoIntent || u.intents.includes("greeting") || u.intents.includes("thanks")) {
      const answer = answerIntent(ctx, infoIntent ?? (u.intents.includes("thanks") ? "thanks" : "greeting"), u)!;
      const resume = await continueBooking(ctx, state, [...answer.blocks, text(L(lang, "Back to your booking:", "Volvamos a tu reserva:"))]);
      return resume;
    }
    const resume = await continueBooking(ctx, state, [text(L(lang, "Sorry, I didn't catch that. Tap an option or tell me a day and time.", "Perdón, no te entendí. Toca una opción o dime un día y una hora."))]);
    return resume;
  }

  // A question that names a barber or a service and asks about time is an availability lookup.
  if (bookingWords || (!infoIntent && (u.serviceSlug || u.barberSlug || u.family) && (u.date || u.time || u.partOfDay))) {
    state = { mode: "booking", draft: {} };
    if (!u.serviceSlug && !u.family && (u.intents.includes("availability") || u.intents.includes("soonest")) && !u.intents.includes("book")) {
      const fallback = defaultService(ctx);
      if (fallback) state.draft = { serviceId: fallback.id, serviceAssumed: true };
    }
    applyUnderstanding(ctx, state, u);
    return continueBooking(ctx, state);
  }

  // "Barber Lo's saturday night": a barber and a day with no other question is an openings lookup.
  if ((infoIntent === "barbers" || !infoIntent) && u.barberSlug && (u.date || u.partOfDay)) {
    const fallback = defaultService(ctx);
    state = { mode: "booking", draft: fallback ? { serviceId: fallback.id, serviceAssumed: true } : {} };
    applyUnderstanding(ctx, state, u);
    return continueBooking(ctx, state);
  }

  if (infoIntent) {
    const first = answerIntent(ctx, infoIntent, u)!;
    return withState(first, state);
  }
  if (u.serviceSlug) return withState(answerIntent(ctx, "services", u)!, state);
  if (u.barberSlug) return withState(answerIntent(ctx, "barbers", u)!, state);
  if (u.intents.includes("greeting") || u.intents.includes("thanks")) return withState(answerIntent(ctx, u.intents.includes("thanks") ? "thanks" : "greeting", u)!, state);

  return {
    blocks: [text(L(lang, `I can book you right here, show live openings, or answer questions about services, prices, barbers, hours and policies. For anything else, the team is at ${business.phone}.`, `Puedo reservarte aquí mismo, mostrarte horarios en vivo o responder sobre servicios, precios, barberos, horario y políticas. Para cualquier otra cosa, el equipo está en el ${business.phone}.`))],
    chips: mainChips(ctx),
    state,
  };
}

function withState(answer: { blocks: Block[]; chips: Chip[] }, state: ConciergeState): ConciergeReply {
  return { ...answer, state };
}

async function respondToChoice(ctx: Context, state: ConciergeState, choice: Choice): Promise<ConciergeReply> {
  const draft = state.draft;
  const clearTime = () => { delete draft.startsAt; delete draft.slotBarberId; };
  switch (choice.type) {
    case "restart":
      return { blocks: [text(L(ctx.lang, "Fresh start. What can I do for you?", "Empecemos de nuevo. ¿En qué te ayudo?"))], chips: mainChips(ctx), state: freshState() };
    case "intent": {
      if (choice.intent === "book") return continueBooking(ctx, { mode: "booking", draft: state.mode === "booking" ? draft : {} });
      if (choice.intent === "soonest") {
        const next: ConciergeState = { mode: "booking", draft: state.mode === "booking" ? { ...draft } : {} };
        if (!next.draft.serviceId) {
          const fallback = defaultService(ctx);
          if (fallback) Object.assign(next.draft, { serviceId: fallback.id, serviceAssumed: true });
        }
        if (!next.draft.barberId) next.draft.firstAvailable = true;
        next.draft.soonest = true;
        delete next.draft.date;
        delete next.draft.startsAt;
        delete next.draft.slotBarberId;
        return continueBooking(ctx, next);
      }
      const answer = answerIntent(ctx, choice.intent, { intents: [choice.intent] });
      if (!answer) return continueBooking(ctx, state);
      if (state.mode === "booking") return continueBooking(ctx, state, [...answer.blocks, text(L(ctx.lang, "Back to your booking:", "Volvamos a tu reserva:"))]);
      return withState(answer, state);
    }
    case "service": {
      const service = serviceById(ctx, choice.serviceId);
      if (!service) return continueBooking(ctx, state);
      if (state.mode !== "booking") { state.mode = "booking"; state.draft = {}; }
      if (state.draft.family && !service.familyAdultEligible) { delete state.draft.family; delete state.draft.familyChildren; }
      if (service.id === kidsService(ctx)?.id) { delete state.draft.family; delete state.draft.familyChildren; }
      state.draft.serviceId = service.id;
      delete state.draft.serviceAssumed;
      delete state.draft.startsAt;
      delete state.draft.slotBarberId;
      return continueBooking(ctx, state);
    }
    case "family": {
      if (state.mode !== "booking") { state.mode = "booking"; state.draft = {}; }
      state.draft.family = true;
      if (choice.children) state.draft.familyChildren = choice.children;
      const current = serviceById(ctx, state.draft.serviceId);
      if (current && (!current.familyAdultEligible || current.id === kidsService(ctx)?.id || state.draft.serviceAssumed)) { delete state.draft.serviceId; delete state.draft.serviceAssumed; }
      delete state.draft.startsAt;
      delete state.draft.slotBarberId;
      return continueBooking(ctx, state);
    }
    case "barber": {
      if (!barberById(ctx, choice.barberId)) return continueBooking(ctx, state);
      if (state.mode !== "booking") { state.mode = "booking"; state.draft = {}; }
      state.draft.barberId = choice.barberId;
      delete state.draft.firstAvailable;
      delete state.draft.startsAt;
      delete state.draft.slotBarberId;
      return continueBooking(ctx, state);
    }
    case "any_barber":
      state.mode = "booking";
      delete draft.barberId;
      draft.firstAvailable = true;
      clearTime();
      return continueBooking(ctx, state);
    case "date":
      state.mode = "booking";
      draft.date = choice.date;
      delete draft.time;
      delete draft.partOfDay;
      delete draft.soonest;
      clearTime();
      return continueBooking(ctx, state);
    case "slot": {
      state.mode = "booking";
      if (!barberById(ctx, choice.barberId) || Number.isNaN(Date.parse(choice.startsAt))) return continueBooking(ctx, state);
      draft.startsAt = choice.startsAt;
      draft.slotBarberId = choice.barberId;
      return continueBooking(ctx, state);
    }
    case "all_times": {
      state.mode = "booking";
      draft.date = choice.date;
      delete draft.time;
      delete draft.partOfDay;
      clearTime();
      if (!draft.serviceId) return continueBooking(ctx, state);
      const slots = uniqueTimes(await search(ctx, draft, choice.date, 1));
      state.awaiting = "time";
      return {
        blocks: [text(L(ctx.lang, `All open times${withWho(ctx, draft)} on ${dayLabel(choice.date, ctx, true)}:`, `Todos los horarios${withWho(ctx, draft)} el ${dayLabel(choice.date, ctx, true)}:`))],
        chips: [...slots.map((slot) => slotChip(ctx, slot, draft)), { label: L(ctx.lang, "Another day", "Otro día"), choice: { type: "change", step: "date" } }],
        state,
      };
    }
    case "change": {
      state.mode = "booking";
      clearTime();
      if (choice.step === "service") { delete draft.serviceId; delete draft.serviceAssumed; }
      if (choice.step === "barber") { delete draft.barberId; delete draft.firstAvailable; }
      if (choice.step === "date") { delete draft.date; delete draft.time; delete draft.partOfDay; delete draft.soonest; }
      if (choice.step === "time") { delete draft.time; delete draft.partOfDay; }
      return continueBooking(ctx, state);
    }
    case "openings": {
      const next: ConciergeState = { mode: "booking", draft: {} };
      const service = serviceById(ctx, choice.serviceId) ?? defaultService(ctx);
      if (service) next.draft.serviceId = service.id;
      if (!choice.serviceId) next.draft.serviceAssumed = true;
      if (choice.barberId && barberById(ctx, choice.barberId)) next.draft.barberId = choice.barberId;
      else next.draft.firstAvailable = true;
      return continueBooking(ctx, next);
    }
  }
}
