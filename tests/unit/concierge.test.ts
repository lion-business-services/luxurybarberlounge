import test from "node:test";
import assert from "node:assert/strict";
import { respond, sanitizeState, type Choice, type ConciergeReply, type SlotQuery } from "../../src/lib/concierge/engine.ts";
import { understand } from "../../src/lib/concierge/understand.ts";
import type { AvailabilitySlot, BookingCatalog } from "../../src/lib/booking/types.ts";
import { zonedDateTimeToUtc, addDays } from "../../src/lib/booking/timezone.ts";

const TZ = "America/New_York";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const services = [
  ["haircut", "Haircut", 60, 5000, true],
  ["skin-fade", "Skin Fade", 40, 5000, true],
  ["beard", "Beard", 25, 1500, true],
  ["cut-and-beard", "Cut + Beard", 60, 5000, true],
  ["kids-haircut", "Kids Haircut", 40, 3500, false],
  ["design", "Design", 60, 15000, true],
] as const;

const catalog: BookingCatalog = {
  source: "supabase",
  location: { id: id(900), name: "Northfield Lounge", timezone: TZ, address: "801 Tilton Road" },
  categories: [],
  services: services.map(([slug, name, minutes, cents, adult], index) => ({
    id: id(100 + index), slug, categoryId: id(1), categoryName: "Haircuts", name, description: `${name} description.`, preparation: "",
    durationMinutes: minutes, priceCents: cents, depositCents: cents, relatedServiceIds: [], familyAdultEligible: adult,
  })),
  addons: [],
  barbers: [
    { slug: "ruben-diaz-jr", name: "Rubén Diaz, Jr.", services: ["haircut", "skin-fade", "beard", "cut-and-beard", "kids-haircut", "design"], languages: [] as string[] },
    { slug: "hommy-rivera", name: "Hommy Rivera", services: ["haircut", "skin-fade", "beard", "cut-and-beard", "kids-haircut"], languages: ["es", "en"] },
    { slug: "luis-rivera", name: "Luis Rivera", services: ["haircut", "kids-haircut"], languages: ["en"] },
  ].map((barber, index) => ({
    id: id(200 + index), slug: barber.slug, name: barber.name, portrait: null, portraitAvif: null, portraitJpeg: null, portraitPosition: "",
    title: "Barber", biography: `${barber.name} bio.`, specialties: index === 2 ? ["sensory-inclusive haircuts"] : ["fades"], languages: barber.languages,
    serviceIds: barber.services.map((slug) => id(100 + services.findIndex((service) => service[0] === slug))), demo: false, bookable: true, availabilityNote: "",
  })),
  family: { bufferMinutes: 5, tiers: [1, 2, 3, 4, 5].map((count) => ({ slug: `family-${count}`, name: `Family ${count}`, description: "", childrenCount: count, childServiceId: id(104) })) },
};

const RUBEN = id(200);
// Friday Oct 30 2026, 10:00 AM in Northfield.
const NOW = zonedDateTimeToUtc("2026-10-30", "10:00:00", TZ);

/** A small stand-in for the availability engine: open on the hour and half hour, 8 AM to 6 PM, closed Mondays; Rubén is off Saturday. */
function fakeFinder(log: SlotQuery[] = []) {
  return async (query: SlotQuery): Promise<AvailabilitySlot[]> => {
    log.push(query);
    const service = catalog.services.find((item) => item.id === query.serviceId)!;
    const minutes = query.familyChildren ? service.durationMinutes + query.familyChildren * (40 + 5) : service.durationMinutes;
    const slots: AvailabilitySlot[] = [];
    for (let offset = 0; offset < query.days; offset += 1) {
      const date = addDays(query.startDate, offset);
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (weekday === 1) continue;
      for (const barber of catalog.barbers) {
        if (query.barberIds && !query.barberIds.includes(barber.id)) continue;
        if (!barber.serviceIds.includes(service.id)) continue;
        if (barber.id === RUBEN && weekday === 6) continue;
        for (let hour = 8; hour < 18; hour += 1) {
          for (const minute of [0, 30]) {
            const start = zonedDateTimeToUtc(date, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`, TZ);
            if (start.getTime() <= NOW.getTime()) continue;
            slots.push({ id: `${barber.id}-${start.toISOString()}`, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + minutes * 60_000).toISOString(), barberId: barber.id, barberName: barber.name, serviceId: service.id, durationMinutes: minutes, estimatedPriceCents: service.priceCents });
          }
        }
      }
    }
    return slots;
  };
}

async function say(text: string, state: ConciergeReply["state"] | null = null, language: "en" | "es" = "en", log: SlotQuery[] = []) {
  return respond({ text, state, language, now: NOW, catalog, findSlots: fakeFinder(log) });
}

async function pick(choice: Choice, state: ConciergeReply["state"], language: "en" | "es" = "en") {
  return respond({ choice, state, language, now: NOW, catalog, findSlots: fakeFinder() });
}

const words = (reply: ConciergeReply) => reply.blocks.map((block) => (block.kind === "text" ? block.text : block.kind === "list" ? block.items.map((item) => `${item.title} ${item.detail ?? ""} ${item.meta ?? ""}`).join(" | ") : block.links.map((link) => link.label).join(" | "))).join("\n");

test("one sentence with service, barber, day and time books straight to the details step", async () => {
  const reply = await say("book me a haircut with ruben tomorrow at 3");
  // Tomorrow is Saturday and Rubén is off Saturday in the stand-in schedule.
  assert.match(words(reply), /no openings with Rubén Diaz, Jr\. on Saturday, October 31/i);
  const tuesday = await say("haircut with ruben next tuesday at 3pm");
  assert.ok(tuesday.booking, "an open exact time goes straight to details");
  assert.equal(tuesday.booking!.barberId, RUBEN);
  assert.equal(tuesday.booking!.startsAt, zonedDateTimeToUtc("2026-11-03", "15:00:00", TZ).toISOString());
  assert.equal(tuesday.booking!.priceCents, 5000);
  assert.equal(tuesday.booking!.serviceFeePercent, 4);
  assert.equal(tuesday.state.awaiting, "details");
});

test("a time that is not open offers the closest real times, never an invented one", async () => {
  const reply = await say("fade with hommy tomorrow at 3:15");
  assert.equal(reply.booking, undefined);
  assert.match(words(reply), /3:15 PM isn't open/);
  const labels = reply.chips.map((chip) => chip.label);
  assert.ok(labels.includes("3:00 PM") && labels.includes("3:30 PM"), labels.join(", "));
});

test("the guided flow asks one thing at a time and every option is a real catalog row or open time", async () => {
  let reply = await pick({ type: "intent", intent: "book" }, { mode: "idle", draft: {} });
  assert.equal(reply.state.awaiting, "service");
  assert.ok(reply.chips.some((chip) => chip.label.startsWith("Haircut · $50")));
  reply = await pick({ type: "service", serviceId: id(102) }, reply.state);
  assert.equal(reply.state.awaiting, "barber");
  assert.match(words(reply), /Beard \(25 min, \$15\)/);
  // Luis does not offer Beard, so he is not offered.
  assert.ok(!reply.chips.some((chip) => chip.label.includes("Luis")));
  reply = await pick({ type: "any_barber" }, reply.state);
  assert.equal(reply.state.awaiting, "date");
  assert.ok(reply.chips[0].primary, "the earliest opening is offered first");
  assert.ok(!reply.chips.some((chip) => chip.label.startsWith("Mon")), "a closed day is never offered");
  const day = reply.chips.find((chip) => chip.choice.type === "date")!;
  reply = await pick(day.choice, reply.state);
  assert.equal(reply.state.awaiting, "time");
  const slot = reply.chips.find((chip) => chip.choice.type === "slot")!;
  reply = await pick(slot.choice, reply.state);
  assert.ok(reply.booking);
  assert.equal(reply.booking!.firstAvailable, true);
});

test("a family booking is one appointment priced and timed from the live catalog", async () => {
  const reply = await say("me and my 2 sons need cuts saturday at 10am");
  assert.ok(reply.booking, words(reply));
  assert.equal(reply.booking!.familyChildren, 2);
  assert.equal(reply.booking!.priceCents, 5000 + 2 * 3500);
  assert.equal(reply.booking!.familyItems.length, 3);
  assert.equal(reply.booking!.serviceName, "Family 2: Haircut + 2 × Kids Haircut");
});

test("questions are answered from the catalog and approved content", async () => {
  assert.match(words(await say("how much is a beard trim?")), /Beard: 25 min, \$15/);
  assert.match(words(await say("what are your hours")), /Monday[\s\S]*Closed/);
  assert.match(words(await say("where are you located?")), /801 Tilton Road/);
  assert.match(words(await say("do you need a deposit?")), /full payment by card[\s\S]*4% service fee/);
  assert.match(words(await say("who speaks spanish")), /Hommy Rivera/);
  assert.match(words(await say("I need to cancel my appointment")), /Manage appointment link/);
  assert.match(words(await say("is hair color available?")), /not currently offered/i);
});

test("an availability question without a service uses a Haircut and says so", async () => {
  const reply = await say("when is hommy available?");
  assert.match(words(reply), /for a Haircut \(60 min\)/);
  assert.ok(reply.chips.some((chip) => chip.label === "Different service"));
});

test("Spanish works end to end", async () => {
  const reply = await say("quiero un corte con hommy mañana a las 3", null, "es");
  assert.ok(reply.booking, words(reply));
  assert.match(words(reply), /está disponible/);
  assert.match(words(await say("cuánto cuesta el corte y barba", null, "es")), /Cut \+ Beard: 60 min, \$50/);
});

test("mid-booking questions are answered and the booking resumes where it was", async () => {
  let reply = await pick({ type: "service", serviceId: id(100) }, { mode: "idle", draft: {} });
  assert.equal(reply.state.awaiting, "barber");
  reply = await say("what time do you close on sunday?", reply.state);
  assert.match(words(reply), /Back to your booking/);
  assert.equal(reply.state.awaiting, "barber");
});

test("a chosen time is checked again before details are taken", async () => {
  const state = sanitizeState({ mode: "booking", draft: { serviceId: id(100), barberId: RUBEN, startsAt: "2026-10-30T05:00:00.000Z", slotBarberId: RUBEN } }, catalog);
  const reply = await respond({ choice: { type: "change", step: "time" }, state: { ...state, draft: { ...state.draft } }, language: "en", now: NOW, catalog, findSlots: fakeFinder() });
  assert.equal(reply.booking, undefined);
  const stale = await respond({ text: "ok", state, language: "en", now: NOW, catalog, findSlots: fakeFinder() });
  assert.equal(stale.booking, undefined, "a time that is no longer open is never confirmed");
});

test("state from the browser is trusted only for real catalog ids", () => {
  const state = sanitizeState({ mode: "booking", draft: { serviceId: "not-a-service", barberId: id(999), familyChildren: 9, family: true, date: "tomorrow" } }, catalog);
  assert.deepEqual(state.draft, { family: true });
});

test("the reader understands the ways clients ask", () => {
  const names = { services: catalog.services.map(({ slug, name }) => ({ slug, name })), barbers: catalog.barbers.map(({ slug, name }) => ({ slug, name })) };
  const today = "2026-10-30";
  assert.deepEqual(understand("cita para corte y barba el 6 de noviembre a las 2", { catalog: names, today }).date, "2026-11-06");
  assert.equal(understand("cut and beard nov 4 at 4:30 pm", { catalog: names, today }).time, "16:30");
  assert.equal(understand("family 3 next tuesday at 10am", { catalog: names, today }).familyChildren, 3);
  assert.equal(understand("Rivera friday", { catalog: names, today }).barberSlug, undefined, "a shared last name is not guessed");
  assert.equal(understand("anyone is fine, earliest please", { catalog: names, today }).firstAvailable, true);
});

test("times are offered as a short, professional selection, never as counts", async () => {
  let reply = await pick({ type: "service", serviceId: id(100) }, { mode: "idle", draft: {} });
  reply = await pick({ type: "any_barber" }, reply.state);
  assert.ok(reply.chips.every((chip) => !/\d+ (times|horarios)/.test(chip.label)), reply.chips.map((chip) => chip.label).join(", "));
  assert.ok(reply.chips.some((chip) => chip.label.startsWith("Tomorrow, Oct 31")));
  const day = reply.chips.find((chip) => chip.choice.type === "date")!;
  reply = await pick(day.choice, reply.state);
  const times = reply.chips.filter((chip) => chip.choice.type === "slot");
  assert.ok(times.length <= 6 && times.length >= 4, `${times.length} times`);
  assert.doesNotMatch(words(reply), /\d+ open times/);
  assert.match(words(reply), /Here are the best times/);
  const parts = reply.chips.filter((chip) => chip.choice.type === "all_times").map((chip) => chip.label);
  assert.deepEqual(parts, ["Morning", "Afternoon", "Evening"]);
  const afternoon = reply.chips.find((chip) => chip.label === "Afternoon")!;
  reply = await pick(afternoon.choice, reply.state);
  assert.match(words(reply), /Afternoon openings/);
  const afternoonTimes = reply.chips.filter((chip) => chip.choice.type === "slot").map((chip) => chip.label);
  assert.ok(afternoonTimes.length > 0 && afternoonTimes.length <= 9);
  assert.ok(afternoonTimes.every((label) => / PM/.test(label)), afternoonTimes.join(", "));
  assert.ok(!reply.chips.some((chip) => chip.label === "Afternoon"), "the part already shown is not offered again");
});
