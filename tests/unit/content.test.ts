import test from "node:test";
import assert from "node:assert/strict";
import { barbers, business, giftCards, hours, packages, services, tiers, unavailableServices } from "../../src/lib/content/site.ts";

const names = [
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

test("canonical business details and hours match the completed intake", () => {
  assert.equal(business.phone, "(609) 384-5171");
  assert.equal(business.email, "info@theluxurybarberlounge.com");
  assert.equal(business.street, "801 Tilton Road, Suite 106");
  assert.equal(business.city, "Northfield");
  assert.equal(business.timezone, "America/New_York");
  assert.deepEqual(hours.map(({ weekday, open, close, closed }) => [weekday, open, close, Boolean(closed)]), [
    [0, "09:00", "16:00", false],
    [1, "", "", true],
    [2, "08:00", "21:00", false],
    [3, "08:00", "21:00", false],
    [4, "08:00", "21:00", false],
    [5, "08:00", "21:00", false],
    [6, "08:00", "21:00", false],
  ]);
});

test("service, barber, membership, and package slugs are unique", () => {
  assert.equal(new Set(services.map((item) => item.slug)).size, services.length);
  assert.equal(new Set(barbers.map((item) => item.slug)).size, barbers.length);
  assert.equal(new Set(tiers.map((item) => item.slug)).size, tiers.length);
  assert.equal(new Set(packages.map((item) => item.slug)).size, packages.length);
});

test("the active barber roster uses the correct mapped identities", () => {
  assert.deepEqual(barbers.map((item) => item.name), names);
  assert.ok(barbers.every((item) => item.identityStatus === "verified" && item.photoProvided));
  assert.equal(barbers.find((item) => item.slug === "barber-los")?.walkIns, false);
  const ruben = barbers.find((item) => item.slug === "ruben-diaz-jr");
  assert.equal(ruben?.title.en, "Owner and Master Barber");
  assert.equal(ruben?.owner, true);
  assert.deepEqual(ruben?.bookingWeekdays, []);
  assert.deepEqual(ruben?.languageCodes, []);
});

test("client-confirmed catalog uses exact prices, durations, and fifty percent deposits", () => {
  const expected = new Map([
    ["haircut", [60, 50]], ["skin-fade", [40, 50]], ["beard", [25, 15]],
    ["cut-and-beard", [60, 50]], ["hot-towel-shave", [40, 45]], ["kids-haircut", [40, 35]],
    ["senior-haircut", [35, 40]], ["line-up", [20, 25]], ["design", [60, 150]],
  ]);
  assert.equal(services.length, expected.size);
  for (const service of services) {
    assert.deepEqual([service.minutes, service.from], expected.get(service.slug));
    assert.equal(service.deposit, service.from / 2);
  }
  assert.deepEqual(unavailableServices.map((item) => item.slug), ["color"]);
});

test("memberships, packages, and vouchers match the intake", () => {
  assert.deepEqual(tiers.map((item) => [item.durationWeeks, item.price]), [[52, 1300], [4, 150]]);
  assert.deepEqual(packages.map((item) => [item.slug, item.from]), [
    ["executive-grooming", 175], ["father-and-son", 70], ["wedding-event", 700],
  ]);
  assert.deepEqual(giftCards, { offered: true, startingAmount: 50, label: { en: "Gift cards and vouchers", es: "Tarjetas de regalo y vouchers" } });
});
