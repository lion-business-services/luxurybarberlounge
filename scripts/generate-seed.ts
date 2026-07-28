import { mkdir, writeFile } from "node:fs/promises";
import { barbers, business, hours, serviceCategories, services, tiers } from "../src/lib/content/site.ts";
import { automationCatalog } from "../src/lib/automation/catalog.ts";

function sql(value: string | null | undefined) {
  if (value == null) return "null";
  return `'${value.replaceAll("'", "''")}'`;
}
function json(value: unknown) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

const businessId = "00000000-0000-4000-8000-000000000001";
const locationId = "00000000-0000-4000-8000-000000000002";
const lines: string[] = [
  "-- Generated, idempotent launch seed for local development and Supabase preview environments.",
  "-- Demo records are explicitly marked and must be confirmed before enabling live commerce.",
  "begin;",
  "",
  `insert into public.businesses (id, name, slug, legal_name, phone, email, website_url, timezone, default_language, status, metadata) values (${sql(businessId)}, ${sql(business.name)}, 'luxury-barber-lounge', ${sql(business.legalName)}, ${sql(business.phone)}, ${sql(business.email)}, ${sql(business.domain)}, ${sql(business.timezone)}, 'en', 'active', ${json({ demo: false, ownerConfirmation: business.ownerConfirmation })}) on conflict (slug) do update set name=excluded.name, legal_name=excluded.legal_name, phone=excluded.phone, email=excluded.email, website_url=excluded.website_url, timezone=excluded.timezone, metadata=excluded.metadata;`,
  `insert into public.locations (id, business_id, name, slug, phone, email, address_line_1, city, region, postal_code, country_code, timezone, parking_notes, accessibility_notes, active) values (${sql(locationId)}, (select id from public.businesses where slug='luxury-barber-lounge'), 'Northfield Lounge', 'northfield', ${sql(business.phone)}, ${sql(business.email)}, ${sql(business.street)}, ${sql(business.city)}, ${sql(business.state)}, ${sql(business.postalCode)}, 'US', ${sql(business.timezone)}, ${json(business.parking)}, ${json(business.accessibility)}, true) on conflict (business_id, slug) do update set phone=excluded.phone, email=excluded.email, address_line_1=excluded.address_line_1, city=excluded.city, region=excluded.region, postal_code=excluded.postal_code, parking_notes=excluded.parking_notes, accessibility_notes=excluded.accessibility_notes, active=true;`,
  "",
];

for (const item of hours) {
  lines.push(`insert into public.business_hours (location_id, weekday, opens_at, closes_at, closed) values ((select id from public.locations where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug='northfield'), ${item.weekday}, ${item.closed ? "null" : sql(item.open)}, ${item.closed ? "null" : sql(item.close)}, ${item.closed ? "true" : "false"}) on conflict (location_id, weekday) do update set opens_at=excluded.opens_at, closes_at=excluded.closes_at, closed=excluded.closed;`);
}
lines.push("");

for (const [index, category] of serviceCategories.entries()) {
  lines.push(`insert into public.service_categories (business_id, slug, name, description, sort_order, active) values ((select id from public.businesses where slug='luxury-barber-lounge'), ${sql(category.slug)}, ${json(category.name)}, ${json(category.description)}, ${index * 10}, true) on conflict (business_id, slug) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order, active=true;`);
}
lines.push("");

for (const [index, item] of services.entries()) {
  lines.push(`insert into public.services (business_id, category_id, slug, name, short_description, full_description, price_cents, starting_price, duration_minutes, deposit_cents, benefits, preparation, maintenance_interval_days, seo, featured, bookable, content_status, active, sort_order) values ((select id from public.businesses where slug='luxury-barber-lounge'), (select id from public.service_categories where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(item.category)}), ${sql(item.slug)}, ${json(item.name)}, ${json(item.blurb)}, ${json(item.description)}, ${item.from * 100}, true, ${item.minutes}, ${item.deposit * 100}, ${json(item.benefits)}, ${json(item.preparation)}, 21, ${json({ title: item.name.en, description: item.blurb.en, tags: item.tags })}, ${item.featured ? "true" : "false"}, true, 'published', true, ${index * 10}) on conflict (business_id, slug) do update set category_id=excluded.category_id, name=excluded.name, short_description=excluded.short_description, full_description=excluded.full_description, price_cents=excluded.price_cents, duration_minutes=excluded.duration_minutes, deposit_cents=excluded.deposit_cents, benefits=excluded.benefits, preparation=excluded.preparation, seo=excluded.seo, featured=excluded.featured, content_status=excluded.content_status, active=true, sort_order=excluded.sort_order;`);
}
lines.push("");

for (const [index, barber] of barbers.entries()) {
  lines.push(`insert into public.barber_profiles (business_id, slug, display_name, professional_title, short_intro, biography, story, specialties, languages, social_links, featured, active, demo, status, sort_order) values ((select id from public.businesses where slug='luxury-barber-lounge'), ${sql(barber.slug)}, ${sql(barber.name)}, ${json(barber.title)}, ${json(barber.bio)}, ${json(barber.bio)}, ${json(barber.story)}, ${json(barber.specialtyTags)}, array[${barber.languages.split(' · ').map((v) => sql(v.toLowerCase())).join(',')}]::text[], '{}'::jsonb, ${index === 0 ? "true" : "false"}, true, true, 'published', ${index * 10}) on conflict (business_id, slug) do update set display_name=excluded.display_name, professional_title=excluded.professional_title, short_intro=excluded.short_intro, biography=excluded.biography, story=excluded.story, specialties=excluded.specialties, languages=excluded.languages, featured=excluded.featured, active=true, demo=true, status='published', sort_order=excluded.sort_order;`);
}
lines.push("");

for (const tier of tiers) {
  lines.push(`insert into public.membership_plans (business_id, slug, name, description, price_cents, billing_interval, benefits, usage_rules, pause_rules, cancellation_rules, active, featured, demo, status) values ((select id from public.businesses where slug='luxury-barber-lounge'), ${sql(tier.slug)}, ${json(tier.name)}, ${json(tier.description)}, ${tier.price * 100}, 'month', ${json(tier.perks)}, ${json({ ownerConfirmationRequired: true })}, ${json({ ownerConfirmationRequired: true })}, ${json({ ownerConfirmationRequired: true })}, false, ${tier.featured ? "true" : "false"}, true, 'draft') on conflict (business_id, slug) do update set name=excluded.name, description=excluded.description, price_cents=excluded.price_cents, benefits=excluded.benefits, featured=excluded.featured, demo=true, active=false, status='draft';`);
}
lines.push("");

for (const definition of automationCatalog) {
  if (definition.subject) {
    for (const locale of ["en", "es"] as const) {
      lines.push(`insert into public.message_templates (business_id, key, channel, locale, subject, body, transactional, variables, status) values ((select id from public.businesses where slug='luxury-barber-lounge'), ${sql(definition.key)}, ${sql(definition.channel)}, ${sql(locale)}, ${sql(definition.subject[locale])}, ${sql(definition.body[locale])}, ${definition.transactional ? "true" : "false"}, array[]::text[], 'approved') on conflict (business_id, key, channel, locale) do update set subject=excluded.subject, body=excluded.body, transactional=excluded.transactional, status='approved';`);
    }
  } else {
    for (const locale of ["en", "es"] as const) {
      lines.push(`insert into public.message_templates (business_id, key, channel, locale, body, transactional, variables, status) values ((select id from public.businesses where slug='luxury-barber-lounge'), ${sql(definition.key)}, ${sql(definition.channel)}, ${sql(locale)}, ${sql(definition.body[locale])}, ${definition.transactional ? "true" : "false"}, array[]::text[], 'approved') on conflict (business_id, key, channel, locale) do update set body=excluded.body, transactional=excluded.transactional, status='approved';`);
    }
  }
}
lines.push("");

const flags = [
  "live_square","square_bookings","walk_in_queue","kiosk","memberships","membership_billing","gift_cards","loyalty","products","ai_concierge","ai_admin","sms","whatsapp","browser_notifications","advanced_analytics","multi_location","event_booking","payout_export",
];
for (const key of flags) {
  lines.push(`insert into public.feature_flags (business_id, key, enabled, description) values ((select id from public.businesses where slug='luxury-barber-lounge'), ${sql(key)}, false, 'Disabled until owner approval and provider activation.') on conflict (business_id, key) do update set enabled=false, description=excluded.description;`);
}

lines.push("", "commit;", "");
await mkdir("supabase/seed", { recursive: true });
await writeFile("supabase/seed/seed.sql", lines.join("\n"), "utf8");
console.log(`Generated seed with ${services.length} services, ${barbers.length} barber profiles, and ${tiers.length} membership plans.`);
