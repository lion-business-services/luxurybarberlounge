import test from "node:test";
import assert from "node:assert/strict";
import { barbers, business, services } from "../../src/lib/content/site.ts";

test("canonical business details are centralized and complete", () => {
  assert.equal(business.phone, "(609) 384-5171");
  assert.equal(business.email, "info@theluxurybarberlounge.com");
  assert.equal(business.street, "801 Tilton Road, Suite 106");
  assert.equal(business.city, "Northfield");
});

test("service and barber slugs are unique", () => {
  assert.equal(new Set(services.map((item) => item.slug)).size, services.length);
  assert.equal(new Set(barbers.map((item) => item.slug)).size, barbers.length);
});

test("public barber records do not use numbered placeholder identities", () => {
  for (const barber of barbers) {
    assert.doesNotMatch(barber.name, /^Barber\s+(One|Two|Three|Four|Five)$/i);
  }
});
