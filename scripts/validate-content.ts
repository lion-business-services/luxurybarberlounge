import assert from "node:assert/strict";
import { barbers, business, faqs, hours, journalPosts, packages, services, tiers } from "../src/lib/content/site.ts";

function unique(values: string[], label: string) {
  assert.equal(new Set(values).size, values.length, `${label} values must be unique`);
}

assert.equal(business.name, "Luxury Barber Lounge");
assert.equal(business.street, "801 Tilton Road, Suite 106");
assert.equal(business.city, "Northfield");
assert.equal(business.state, "NJ");
assert.equal(business.postalCode, "08225");
assert.match(business.phoneHref, /^tel:\+1\d{10}$/);
assert.match(business.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
assert.match(business.domain, /^https:\/\//);
assert.equal(hours.length, 7, "All seven days must be represented");
assert.ok(services.length >= 25, "The service catalog must remain comprehensive");
assert.ok(barbers.length >= 2, "At least two curated barber profiles are required");
assert.ok(tiers.length >= 3, "Membership comparison requires at least three tiers");
assert.ok(packages.length >= 3, "Package page requires at least three packages");
assert.ok(faqs.length >= 8, "FAQ should answer the primary pre-visit questions");
assert.ok(journalPosts.length >= 3, "Journal requires launch content");

unique(services.map((item) => item.slug), "service slug");
unique(barbers.map((item) => item.slug), "barber slug");
unique(tiers.map((item) => item.slug), "membership slug");
unique(packages.map((item) => item.slug), "package slug");
unique(journalPosts.map((item) => item.slug), "journal slug");

for (const item of services) {
  assert.ok(item.name.en && item.name.es, `Service ${item.slug} must be bilingual`);
  assert.ok(item.description.en && item.description.es, `Service ${item.slug} must have bilingual descriptions`);
  assert.ok(item.minutes > 0, `Service ${item.slug} must have a positive duration`);
  assert.ok(item.from >= 0, `Service ${item.slug} must have a non-negative starting price`);
}

for (const barber of barbers) {
  assert.ok(!/^Barber\s+(One|Two|Three|Four|Five)$/i.test(barber.name), "Placeholder barber names cannot be public");
  assert.ok(barber.bio.en && barber.bio.es, `Barber ${barber.slug} must be bilingual`);
}

console.log(`Content validation passed: ${services.length} services, ${barbers.length} barbers, ${tiers.length} memberships.`);
