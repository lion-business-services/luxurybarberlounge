import { mkdir, writeFile } from "node:fs/promises";
import {
  barbers,
  business,
  giftCards,
  hours,
  packages,
  serviceCategories,
  services,
  tiers,
} from "../src/lib/content/site.ts";
import { automationCatalog } from "../src/lib/automation/catalog.ts";

function sql(value: string | null | undefined) {
  if (value == null) return "null";
  return `'${value.replaceAll("'", "''")}'`;
}

function json(value: unknown) {
  return `${sql(JSON.stringify(value))}::jsonb`;
}

function cents(value: number) {
  return Math.round(value * 100);
}

const businessId = "00000000-0000-4000-8000-000000000001";
const locationId = "00000000-0000-4000-8000-000000000002";
const lines: string[] = [
  "-- Generated final client-intake seed for local development and preview environments.",
  "-- Production credentials and provider identifiers are intentionally excluded.",
  "begin;",
  "",
  `insert into public.businesses (id,name,slug,legal_name,phone,email,website_url,timezone,default_language,status,metadata) values (${sql(businessId)},${sql(business.name)},'luxury-barber-lounge',${sql(business.legalName)},${sql(business.phone)},${sql(business.email)},${sql(business.domain)},${sql(business.timezone)},'en','active',${json({ clientIntakeVersion: "2026-08-06", depositPercent: 50, kidsAgeLimit: 10, seniorAgeThreshold: 55, giftCards })}) on conflict (slug) do update set name=excluded.name,legal_name=excluded.legal_name,phone=excluded.phone,email=excluded.email,website_url=excluded.website_url,timezone=excluded.timezone,status='active',metadata=public.businesses.metadata||excluded.metadata;`,
  `insert into public.locations (id,business_id,name,slug,phone,email,address_line_1,city,region,postal_code,country_code,timezone,parking_notes,accessibility_notes,active) values (${sql(locationId)},(select id from public.businesses where slug='luxury-barber-lounge'),'Northfield Lounge','northfield',${sql(business.phone)},${sql(business.email)},${sql(business.street)},${sql(business.city)},${sql(business.state)},${sql(business.postalCode)},'US',${sql(business.timezone)},${json(business.parking)},${json(business.accessibility)},true) on conflict (business_id,slug) do update set phone=excluded.phone,email=excluded.email,address_line_1=excluded.address_line_1,city=excluded.city,region=excluded.region,postal_code=excluded.postal_code,timezone=excluded.timezone,parking_notes=excluded.parking_notes,accessibility_notes=excluded.accessibility_notes,active=true;`,
  `insert into public.location_settings (location_id,walk_ins_enabled,kiosk_enabled,max_queue_size,default_buffer_minutes,settings) values ((select id from public.locations where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug='northfield'),true,true,30,10,${json({ booking_enabled: true, queue_board_enabled: true, walk_ins_any_open_time: true, deposit_percent: 50, kids_age_limit: 10, senior_age_threshold: 55, gift_cards: { offered: true, starting_amount_cents: 5000 }, color_service_offered: false, client_intake_version: "2026-08-06" })}) on conflict (location_id) do update set walk_ins_enabled=true,kiosk_enabled=true,max_queue_size=greatest(public.location_settings.max_queue_size,30),settings=public.location_settings.settings||excluded.settings,updated_at=timezone('utc',now());`,
  "",
];

for (const item of hours) {
  lines.push(`insert into public.business_hours (location_id,weekday,opens_at,closes_at,closed) values ((select id from public.locations where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug='northfield'),${item.weekday},${item.closed ? "null" : sql(item.open)},${item.closed ? "null" : sql(item.close)},${item.closed ? "true" : "false"}) on conflict (location_id,weekday) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,closed=excluded.closed;`);
}
lines.push("");

for (const [index, category] of serviceCategories.entries()) {
  lines.push(`insert into public.service_categories (business_id,slug,name,description,sort_order,active) values ((select id from public.businesses where slug='luxury-barber-lounge'),${sql(category.slug)},${json(category.name)},${json(category.description)},${index * 10},true) on conflict (business_id,slug) do update set name=excluded.name,description=excluded.description,sort_order=excluded.sort_order,active=true;`);
}
lines.push(`update public.service_categories set active=false where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug not in (${serviceCategories.map((item) => sql(item.slug)).join(",")});`, "");

for (const [index, item] of services.entries()) {
  lines.push(`insert into public.services (business_id,category_id,slug,name,short_description,full_description,price_cents,starting_price,duration_minutes,deposit_cents,benefits,preparation,maintenance_interval_days,seo,featured,bookable,content_status,active,sort_order) values ((select id from public.businesses where slug='luxury-barber-lounge'),(select id from public.service_categories where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(item.category)}),${sql(item.slug)},${json(item.name)},${json(item.blurb)},${json(item.description)},${cents(item.from)},${item.startingPrice ? "true" : "false"},${item.minutes},${cents(item.deposit)},${json(item.benefits)},${json(item.preparation)},21,${json({ title: item.name.en, description: item.blurb.en, tags: item.tags })},${item.featured ? "true" : "false"},true,'published',true,${index * 10}) on conflict (business_id,slug) do update set category_id=excluded.category_id,name=excluded.name,short_description=excluded.short_description,full_description=excluded.full_description,price_cents=excluded.price_cents,starting_price=excluded.starting_price,duration_minutes=excluded.duration_minutes,deposit_cents=excluded.deposit_cents,benefits=excluded.benefits,preparation=excluded.preparation,seo=excluded.seo,featured=excluded.featured,bookable=true,content_status='published',active=true,sort_order=excluded.sort_order;`);
}
lines.push(`update public.services set active=false,bookable=false,content_status='archived' where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug not in (${services.map((item) => sql(item.slug)).join(",")});`, "");

lines.push("create table if not exists public.barber_profile_settings (barber_profile_id uuid primary key references public.barber_profiles(id) on delete cascade,years_cutting text,walk_ins boolean not null default true,photo_provided boolean not null default false,working_days jsonb not null default '{}'::jsonb,instagram_handle text,instagram_status text not null default 'not_provided' check (instagram_status in ('active','pending_confirmation','not_provided')),intake_notes jsonb not null default '{}'::jsonb,updated_at timestamptz not null default timezone('utc',now()));", "");

for (const barber of barbers) {
  const social = barber.socialStatus === "active" && barber.socialUrl
    ? { instagram: barber.socialUrl, instagramHandle: barber.instagramHandle }
    : { instagramStatus: barber.socialStatus.replaceAll("-", "_"), instagramHandle: barber.instagramHandle ?? null };
  lines.push(`insert into public.barber_profiles (business_id,slug,display_name,professional_title,short_intro,biography,story,specialties,languages,social_links,featured,active,demo,status,sort_order) values ((select id from public.businesses where slug='luxury-barber-lounge'),${sql(barber.slug)},${sql(barber.name)},${json(barber.title)},${json(barber.bio)},${json(barber.bio)},${json(barber.story)},${json(barber.specialtyTags)},array[${barber.languages.split(" · ").map((value) => sql(value.toLowerCase())).join(",")}]::text[],${json(social)},${barber.featured ? "true" : "false"},true,false,'published',${barber.sortOrder * 10}) on conflict (business_id,slug) do update set display_name=excluded.display_name,professional_title=excluded.professional_title,short_intro=excluded.short_intro,biography=excluded.biography,story=excluded.story,specialties=excluded.specialties,languages=excluded.languages,social_links=excluded.social_links,featured=excluded.featured,active=true,demo=false,status='published',sort_order=excluded.sort_order;`);
  lines.push(`insert into public.barber_profile_settings (barber_profile_id,years_cutting,walk_ins,photo_provided,working_days,instagram_handle,instagram_status,intake_notes) values ((select id from public.barber_profiles where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(barber.slug)}),${sql(barber.yearsCutting)},${barber.walkIns ? "true" : "false"},${barber.photoProvided ? "true" : "false"},${json(barber.workingDays)},${sql(barber.instagramHandle)},${sql(barber.socialStatus.replaceAll("-", "_"))},${json({ schedulePending: barber.bookingWeekdays.length === 0 })}) on conflict (barber_profile_id) do update set years_cutting=excluded.years_cutting,walk_ins=excluded.walk_ins,photo_provided=excluded.photo_provided,working_days=excluded.working_days,instagram_handle=excluded.instagram_handle,instagram_status=excluded.instagram_status,intake_notes=excluded.intake_notes,updated_at=timezone('utc',now());`);
}
lines.push(`update public.barber_profiles set active=false,featured=false where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug not in (${barbers.map((item) => sql(item.slug)).join(",")});`, "");

lines.push("update public.barber_profile_services set active=false where barber_profile_id in (select id from public.barber_profiles where business_id=(select id from public.businesses where slug='luxury-barber-lounge'));", "");
for (const barber of barbers) {
  for (const serviceSlug of barber.serviceSlugs) {
    lines.push(`insert into public.barber_profile_services (barber_profile_id,service_id,active) values ((select id from public.barber_profiles where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(barber.slug)}),(select id from public.services where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(serviceSlug)}),true) on conflict (barber_profile_id,service_id) do update set active=true;`);
  }
}
lines.push("");
for (const item of services) {
  lines.push(`insert into public.service_locations (service_id,location_id,active) values ((select id from public.services where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(item.slug)}),(select id from public.locations where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug='northfield'),true) on conflict (service_id,location_id) do update set active=true;`);
}
lines.push("");

lines.push("update public.barber_schedules set active=false,effective_to=current_date where barber_profile_id in (select id from public.barber_profiles where business_id=(select id from public.businesses where slug='luxury-barber-lounge')) and active=true;", "");
for (const barber of barbers) {
  for (const weekday of barber.bookingWeekdays) {
    const businessHour = hours.find((item) => item.weekday === weekday && !item.closed);
    if (!businessHour) continue;
    lines.push(`insert into public.barber_schedules (barber_user_id,barber_profile_id,location_id,weekday,starts_at,ends_at,active,effective_from,effective_to) values (null,(select id from public.barber_profiles where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(barber.slug)}),(select id from public.locations where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug='northfield'),${weekday},${sql(businessHour.open)},${sql(businessHour.close)},true,current_date,null) on conflict (barber_profile_id,location_id,weekday,effective_from) where barber_profile_id is not null do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=true,effective_to=null;`);
  }
}
lines.push("");

for (const tier of tiers) {
  lines.push(`insert into public.membership_plans (business_id,slug,name,description,price_cents,billing_interval,included_services,benefits,usage_rules,pause_rules,cancellation_rules,active,featured,demo,status) values ((select id from public.businesses where slug='luxury-barber-lounge'),${sql(tier.slug)},${json(tier.name)},${json(tier.description)},${cents(tier.price)},${sql(tier.billingInterval)},${json([{ name: tier.perks[0]?.en ?? "Included service" }])},${json(tier.perks)},${json({ durationWeeks: tier.durationWeeks, termsVersion: "2026-08-06" })},${json({ ownerConfirmationRequired: true })},${json({ ownerConfirmationRequired: true })},true,${tier.featured ? "true" : "false"},false,'published') on conflict (business_id,slug) do update set name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,billing_interval=excluded.billing_interval,included_services=excluded.included_services,benefits=excluded.benefits,usage_rules=excluded.usage_rules,active=true,featured=excluded.featured,demo=false,status='published';`);
  lines.push(`insert into public.membership_plan_versions (plan_id,version,name,description,price_cents,billing_interval,benefits,usage_rules,status,effective_from) values ((select id from public.membership_plans where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug=${sql(tier.slug)}),1,${json(tier.name)},${json(tier.description)},${cents(tier.price)},${sql(tier.billingInterval)},${json(tier.perks)},${json({ durationWeeks: tier.durationWeeks, termsVersion: "2026-08-06" })},'active',timezone('utc',now())) on conflict (plan_id,version) do update set name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,billing_interval=excluded.billing_interval,benefits=excluded.benefits,usage_rules=excluded.usage_rules,status='active';`);
}
lines.push(`update public.membership_plans set active=false,featured=false,status='archived' where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and slug not in (${tiers.map((item) => sql(item.slug)).join(",")});`, "");

lines.push("delete from public.packages where business_id=(select id from public.businesses where slug='luxury-barber-lounge') and not exists (select 1 from public.package_redemptions r where r.package_id=public.packages.id);", "");
for (const item of packages) {
  lines.push(`insert into public.packages (business_id,name,description,price_cents,visits,per_visit_value_cents,status) values ((select id from public.businesses where slug='luxury-barber-lounge'),${json(item.name)},${json(item.description)},${cents(item.from)},1,${cents(item.from)},'active');`);
}
lines.push("");

for (const definition of automationCatalog) {
  for (const locale of ["en", "es"] as const) {
    const subject = definition.subject ? definition.subject[locale] : null;
    lines.push(`insert into public.message_templates (business_id,key,channel,locale,subject,body,transactional,variables,status) values ((select id from public.businesses where slug='luxury-barber-lounge'),${sql(definition.key)},${sql(definition.channel)},${sql(locale)},${sql(subject)},${sql(definition.body[locale])},${definition.transactional ? "true" : "false"},array[]::text[],'approved') on conflict (business_id,key,channel,locale) do update set subject=excluded.subject,body=excluded.body,transactional=excluded.transactional,status='approved';`);
  }
}
lines.push("");

const flags = [
  "live_square", "square_bookings", "walk_in_queue", "kiosk", "memberships",
  "membership_billing", "gift_cards", "loyalty", "products", "ai_concierge",
  "ai_admin", "sms", "whatsapp", "browser_notifications", "advanced_analytics",
  "multi_location", "event_booking", "payout_export",
];
for (const key of flags) {
  const enabled = key === "walk_in_queue" || key === "kiosk" || key === "memberships" || key === "gift_cards";
  lines.push(`insert into public.feature_flags (business_id,key,enabled,description) values ((select id from public.businesses where slug='luxury-barber-lounge'),${sql(key)},${enabled ? "true" : "false"},${sql(enabled ? "Configured from the final client intake." : "Disabled until provider activation or owner approval.")}) on conflict (business_id,key) do update set enabled=excluded.enabled,description=excluded.description;`);
}

lines.push("", "commit;", "");
await mkdir("supabase/seed", { recursive: true });
await writeFile("supabase/seed/seed.sql", lines.join("\n"), "utf8");
console.log(`Generated final seed with ${services.length} services, ${barbers.length} barbers, ${tiers.length} memberships, and ${packages.length} packages.`);
