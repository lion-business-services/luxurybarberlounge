import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  barbers,
  business,
  faqs,
  giftCards,
  hours,
  journalPosts,
  packages,
  services,
  tiers,
  unavailableServices,
} from "../src/lib/content/site.ts";

function unique(values: string[], label: string) {
  assert.equal(new Set(values).size, values.length, `${label} values must be unique`);
}

const expectedBarbers = [
  "Rubén Diaz, Jr.",
  "Angelica Aquino",
  "Hommy Rivera",
  "Barber Lo's",
  "Jose",
  "Elvis",
  "Alfredo Hernandez (Pollo)",
  "Russ Hawkins",
  "Daniel Penalo",
];
const forbiddenNames = [
  ["Amaya", "Reyes"],
  ["Adrian", "Cole"],
  ["Mateo", "Cruz"],
  ["Julian", "Vega"],
  ["Elias", "Moreno"],
  ["Nico", "Santos"],
  ["Marcus", "Bennett"],
  ["Andre", "Silva"],
  ["Russ", "Hawskin"],
].map((parts) => parts.join(" "));
const expectedServices = new Map([
  ["haircut", [60, 50]],
  ["skin-fade", [40, 50]],
  ["beard", [25, 15]],
  ["cut-and-beard", [60, 50]],
  ["hot-towel-shave", [40, 45]],
  ["kids-haircut", [40, 35]],
  ["senior-haircut", [35, 40]],
  ["line-up", [20, 25]],
  ["design", [60, 150]],
]);

assert.equal(business.name, "Luxury Barber Lounge");
assert.equal(business.street, "801 Tilton Road, Suite 106");
assert.equal(business.city, "Northfield");
assert.equal(business.state, "NJ");
assert.equal(business.postalCode, "08225");
assert.equal(business.timezone, "America/New_York");
assert.match(business.phoneHref, /^tel:\+1\d{10}$/);
assert.match(business.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
assert.match(business.domain, /^https:\/\//);

assert.deepEqual(
  hours.map(({ weekday, open, close, closed }) => ({ weekday, open, close, closed: Boolean(closed) })),
  [
    { weekday: 0, open: "09:00", close: "16:00", closed: false },
    { weekday: 1, open: "", close: "", closed: true },
    { weekday: 2, open: "08:00", close: "21:00", closed: false },
    { weekday: 3, open: "08:00", close: "21:00", closed: false },
    { weekday: 4, open: "08:00", close: "21:00", closed: false },
    { weekday: 5, open: "08:00", close: "21:00", closed: false },
    { weekday: 6, open: "08:00", close: "21:00", closed: false },
  ],
  "Business hours must match the completed client intake",
);

assert.equal(services.length, 9, "Only the nine client-confirmed bookable services may be active");
assert.equal(barbers.length, 9, "The public barber roster must contain Ruben plus the eight mapped client profiles");
assert.equal(tiers.length, 2, "The two completed membership plans must be published");
assert.equal(packages.length, 3, "The three completed packages must be published");
assert.equal(giftCards.offered, true);
assert.equal(giftCards.startingAmount, 50);
assert.deepEqual(unavailableServices.map((item) => item.slug), ["color"]);
assert.ok(faqs.length >= 8, "FAQ should answer the primary pre-visit questions");
assert.ok(journalPosts.length >= 3, "Journal requires launch content");

unique(services.map((item) => item.slug), "service slug");
unique(barbers.map((item) => item.slug), "barber slug");
unique(tiers.map((item) => item.slug), "membership slug");
unique(packages.map((item) => item.slug), "package slug");
unique(journalPosts.map((item) => item.slug), "journal slug");

assert.deepEqual(barbers.map((item) => item.name), expectedBarbers);
const publicContent = JSON.stringify({ barbers, services, tiers, packages });
for (const name of forbiddenNames) assert.equal(publicContent.includes(name), false, `Fictional name remains: ${name}`);

for (const item of services) {
  const expected = expectedServices.get(item.slug);
  assert.ok(expected, `Unexpected active service ${item.slug}`);
  assert.ok(item.name.en && item.name.es, `Service ${item.slug} must be bilingual`);
  assert.ok(item.description.en && item.description.es, `Service ${item.slug} must have bilingual descriptions`);
  assert.equal(item.minutes, expected[0], `Incorrect duration for ${item.slug}`);
  assert.equal(item.from, expected[1], `Incorrect price for ${item.slug}`);
  assert.equal(item.deposit, item.from / 2, `Deposit for ${item.slug} must equal 50%`);
}
assert.equal(services.find((item) => item.slug === "design")?.startingPrice, true);
assert.match(services.find((item) => item.slug === "kids-haircut")?.description.en ?? "", /10 years old/);
assert.match(services.find((item) => item.slug === "senior-haircut")?.description.en ?? "", /55 years old/);

for (const barber of barbers) {
  assert.equal(barber.identityStatus, "verified", `${barber.name} must be identity verified`);
  assert.equal(barber.active, true, `${barber.name} must be active`);
  assert.ok(barber.bio.en && barber.bio.es, `Barber ${barber.slug} must be bilingual`);
  assert.equal(barber.photoProvided, true, `${barber.name} must retain the supplied portrait`);
  assert.ok(barber.image.objectPosition.card, `${barber.name} needs a card focal point`);
  assert.ok(barber.image.objectPosition.profile, `${barber.name} needs a profile focal point`);
  assert.ok(barber.image.objectPosition.mobile, `${barber.name} needs a mobile focal point`);
  assert.ok(barber.image.objectPosition.booking, `${barber.name} needs a booking focal point`);
  for (const path of [barber.image.card, barber.image.profile, barber.image.profileAvif, barber.image.mobile]) {
    assert.equal(existsSync(`public${path}`), true, `Missing portrait derivative: ${path}`);
  }
  for (const folder of ["cards", "mobile", "booking", "tablet", "profiles", "desktop"]) {
    for (const extension of ["avif", "webp", "jpg"]) {
      assert.equal(existsSync(`public/media/barbers/${folder}/${barber.slug}.${extension}`), true, `Missing responsive image: ${folder}/${barber.slug}.${extension}`);
    }
  }
  for (const weekday of barber.bookingWeekdays) {
    assert.notEqual(weekday, 1, `${barber.name} cannot be scheduled on closed Monday`);
    assert.ok(hours.some((day) => day.weekday === weekday && !day.closed), `${barber.name} schedule must use an open business day`);
  }
  if (barber.socialStatus === "active") assert.match(barber.socialUrl ?? "", /^https:\/\/instagram\.com\//);
}

assert.equal(barbers.find((item) => item.slug === "barber-los")?.walkIns, false);
assert.deepEqual(barbers.find((item) => item.slug === "barber-los")?.bookingWeekdays, []);
assert.deepEqual(barbers.find((item) => item.slug === "angelica-aquino")?.bookingWeekdays, [3]);
const ruben = barbers.find((item) => item.slug === "ruben-diaz-jr");
assert.equal(ruben?.title.en, "Owner and Master Barber");
assert.equal(ruben?.owner, true);
assert.equal(ruben?.compactName, "Ruben");
assert.deepEqual(ruben?.bookingWeekdays, []);
assert.deepEqual(ruben?.languageCodes, []);

console.log(`Content validation passed: ${services.length} services, ${barbers.length} barbers, ${tiers.length} memberships, ${packages.length} packages.`);
