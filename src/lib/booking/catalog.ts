import "server-only";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { businessConfig } from "@/lib/config/business";
import { barbers, serviceAddOns, serviceCategories, services } from "@/lib/content/site";
import type { BookingCatalog } from "@/lib/booking/types";

function english(value: unknown) {
  if (value && typeof value === "object" && "en" in value) return String((value as { en?: unknown }).en ?? "");
  return String(value ?? "");
}

export class BookingCatalogError extends Error {
  constructor(public readonly code: string, message = code) {
    super(message);
    this.name = "BookingCatalogError";
  }
}

function requireResult(error: { message?: string; code?: string } | null, code: string) {
  if (error) {
    console.error("booking-catalog-operation", { code, providerCode: error.code, providerMessage: error.message?.slice(0, 240) });
    throw new BookingCatalogError(code);
  }
}

function isoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: businessConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Ensures the minimum verified production catalog exists before it is returned.
 * This is deliberately idempotent: a fresh production database becomes usable
 * after migrations are applied, while owner edits remain intact on later reads.
 */
export async function ensureBookingCatalog(): Promise<{ admin: NonNullable<ReturnType<typeof createUntypedAdminSupabase>>; catalog: BookingCatalog }> {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new BookingCatalogError("SUPABASE_NOT_CONFIGURED");

  const { data: business, error: businessError } = await admin.from("businesses").upsert({
    name: businessConfig.name,
    legal_name: businessConfig.legalName,
    slug: businessConfig.slug,
    phone: businessConfig.phone,
    email: businessConfig.bookingEmail,
    website_url: businessConfig.siteUrl,
    timezone: businessConfig.timezone,
    default_language: "en",
    status: "active",
  }, { onConflict: "slug" }).select("id").single();
  requireResult(businessError, "BUSINESS_NOT_CONFIGURED");
  if (!business?.id) throw new BookingCatalogError("BUSINESS_NOT_CONFIGURED");

  const { data: location, error: locationError } = await admin.from("locations").upsert({
    business_id: business.id,
    name: "Northfield Lounge",
    slug: "northfield",
    phone: businessConfig.phone,
    email: businessConfig.bookingEmail,
    address_line_1: businessConfig.address.line1,
    city: businessConfig.address.city,
    region: businessConfig.address.region,
    postal_code: businessConfig.address.postalCode,
    country_code: businessConfig.address.country,
    timezone: businessConfig.timezone,
    active: true,
  }, { onConflict: "business_id,slug" }).select("id,name,timezone,address_line_1,city,region,postal_code").single();
  requireResult(locationError, "LOCATION_NOT_CONFIGURED");
  if (!location?.id) throw new BookingCatalogError("LOCATION_NOT_CONFIGURED");

  const hoursResult = await admin.from("business_hours").upsert(businessConfig.hours.map((item) => ({
    location_id: location.id,
    weekday: item.weekday,
    opens_at: item.closed ? null : item.open,
    closes_at: item.closed ? null : item.close,
    closed: Boolean(item.closed),
  })), { onConflict: "location_id,weekday" });
  requireResult(hoursResult.error, "BUSINESS_HOURS_UNAVAILABLE");

  const { data: categoryRows, error: categoryError } = await admin.from("service_categories").upsert(serviceCategories.map((item, index) => ({
    business_id: business.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    sort_order: index,
    active: true,
  })), { onConflict: "business_id,slug" }).select("id,slug,name,description");
  requireResult(categoryError, "SERVICE_CATEGORIES_UNAVAILABLE");
  const categoryBySlug = new Map((categoryRows ?? []).map((item) => [item.slug, item]));

  const { data: serviceRows, error: serviceError } = await admin.from("services").upsert(services.map((item, index) => ({
    business_id: business.id,
    category_id: categoryBySlug.get(item.category)?.id ?? null,
    slug: item.slug,
    name: item.name,
    short_description: item.blurb,
    full_description: item.description,
    price_cents: Math.round(item.from * 100),
    starting_price: true,
    duration_minutes: item.minutes,
    deposit_cents: Math.round(item.deposit * 100),
    benefits: item.benefits,
    preparation: item.preparation,
    square_catalog_id: item.squareCatalogId ?? null,
    featured: Boolean(item.featured),
    bookable: true,
    content_status: "published",
    active: true,
    sort_order: index,
  })), { onConflict: "business_id,slug" }).select("id,slug,category_id,name,short_description,full_description,price_cents,duration_minutes,deposit_cents,active,bookable,content_status");
  requireResult(serviceError, "SERVICES_UNAVAILABLE");
  const serviceBySlug = new Map((serviceRows ?? []).map((item) => [item.slug, item]));

  const { data: addonRows, error: addonError } = await admin.from("service_addons").upsert(serviceAddOns.map((item) => ({
    business_id: business.id,
    service_id: null,
    slug: item.slug,
    name: item.name,
    description: { en: "Optional enhancement.", es: "Mejora opcional." },
    price_cents: Math.round(item.price * 100),
    duration_minutes: item.minutes,
    active: true,
  })), { onConflict: "business_id,slug" }).select("id,slug,service_id,name,description,price_cents,duration_minutes");
  requireResult(addonError, "ADDONS_UNAVAILABLE");

  const verifiedSourceBarbers = barbers.filter((item) => item.active && item.identityStatus === "verified");
  if (!verifiedSourceBarbers.length) throw new BookingCatalogError("NO_VERIFIED_BARBERS");

  const barberUpsert = await admin.from("barber_profiles").upsert(verifiedSourceBarbers.map((item) => ({
    business_id: business.id,
    slug: item.slug,
    display_name: item.name,
    professional_title: item.title,
    short_intro: item.bio,
    biography: item.bio,
    story: item.story,
    specialties: item.specialtyTags,
    languages: item.languages.split("·").map((value) => value.trim().toLowerCase()),
    social_links: {},
    featured: Boolean(item.featured),
    active: true,
    demo: false,
    status: "published",
    sort_order: item.sortOrder,
  })), { onConflict: "business_id,slug" });
  requireResult(barberUpsert.error, "BARBERS_UNAVAILABLE");

  const { data: barberRows, error: liveBarberError } = await admin
    .from("barber_profiles")
    .select("id,slug,display_name,professional_title,short_intro,specialties,languages,demo,staff_user_id")
    .eq("business_id", business.id)
    .eq("active", true)
    .eq("demo", false)
    .eq("status", "published")
    .order("sort_order");
  requireResult(liveBarberError, "BARBERS_UNAVAILABLE");
  if (!(barberRows ?? []).length) throw new BookingCatalogError("NO_LIVE_BARBERS");

  const eligibility: Array<{ barber_profile_id: string; service_id: string; active: boolean }> = [];
  for (const barber of verifiedSourceBarbers) {
    const row = (barberRows ?? []).find((item) => item.slug === barber.slug);
    if (!row) continue;
    for (const slug of barber.serviceSlugs) {
      const service = serviceBySlug.get(slug);
      if (service) eligibility.push({ barber_profile_id: row.id, service_id: service.id, active: true });
    }
  }
  if (!eligibility.length) throw new BookingCatalogError("NO_BOOKABLE_SERVICE_MAPPINGS");
  const eligibilityUpsert = await admin.from("barber_profile_services").upsert(eligibility, { onConflict: "barber_profile_id,service_id" });
  requireResult(eligibilityUpsert.error, "BOOKING_MIGRATIONS_REQUIRED");

  const liveBarberIds = (barberRows ?? []).map((item) => item.id);
  const { data: existingSchedules, error: scheduleReadError } = await admin
    .from("barber_schedules")
    .select("id,barber_profile_id,weekday,active,effective_from,effective_to")
    .in("barber_profile_id", liveBarberIds)
    .eq("location_id", location.id);
  requireResult(scheduleReadError, "BOOKING_MIGRATIONS_REQUIRED");

  const today = isoDate();
  const scheduleRows = (barberRows ?? []).flatMap((barber) => businessConfig.hours
    .filter((item) => !item.closed)
    .filter((item) => !(existingSchedules ?? []).some((schedule) =>
      String(schedule.barber_profile_id) === String(barber.id)
      && Number(schedule.weekday) === item.weekday
      && Boolean(schedule.active)
      && (!schedule.effective_to || String(schedule.effective_to) >= today)))
    .map((item) => ({
      barber_user_id: null,
      barber_profile_id: barber.id,
      location_id: location.id,
      weekday: item.weekday,
      starts_at: item.open,
      ends_at: item.close,
      active: true,
      effective_from: today,
      effective_to: null,
    })));
  if (scheduleRows.length) {
    const scheduleInsert = await admin.from("barber_schedules").insert(scheduleRows);
    requireResult(scheduleInsert.error, "BARBER_SCHEDULES_UNAVAILABLE");
  }

  const { data: eligibilityRows, error: eligibilityReadError } = await admin
    .from("barber_profile_services")
    .select("barber_profile_id,service_id,active")
    .in("barber_profile_id", liveBarberIds)
    .eq("active", true);
  requireResult(eligibilityReadError, "BOOKING_MIGRATIONS_REQUIRED");

  const { data: scheduleCheck, error: scheduleCheckError } = await admin
    .from("barber_schedules")
    .select("barber_profile_id,weekday")
    .in("barber_profile_id", liveBarberIds)
    .eq("location_id", location.id)
    .eq("active", true)
    .or(`effective_to.is.null,effective_to.gte.${today}`);
  requireResult(scheduleCheckError, "BARBER_SCHEDULES_UNAVAILABLE");
  if (!(scheduleCheck ?? []).length) throw new BookingCatalogError("NO_ACTIVE_BARBER_SCHEDULES");

  const categories = (categoryRows ?? []).map((item) => ({ id: item.id, slug: item.slug, name: english(item.name), description: english(item.description) }));
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const eligibleServiceIds = new Set((eligibilityRows ?? []).map((item) => String(item.service_id)));
  const catalogServices = (serviceRows ?? [])
    .filter((item) => item.active && item.bookable && item.content_status === "published" && eligibleServiceIds.has(String(item.id)))
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      categoryId: item.category_id ?? "",
      categoryName: categoryById.get(item.category_id ?? "")?.name ?? "Services",
      name: english(item.name),
      description: english(item.full_description) || english(item.short_description),
      preparation: english(services.find((source) => source.slug === item.slug)?.preparation),
      durationMinutes: Number(item.duration_minutes ?? 30),
      priceCents: Number(item.price_cents ?? 0),
      depositCents: Number(item.deposit_cents ?? 0),
      relatedServiceIds: [],
    }));
  if (!catalogServices.length) throw new BookingCatalogError("NO_BOOKABLE_SERVICES");

  const catalogBarbers = (barberRows ?? []).map((item) => {
    const source = barbers.find((barber) => barber.slug === item.slug);
    return {
      id: item.id,
      slug: item.slug,
      name: english(item.display_name),
      portrait: source?.image.card ?? null,
      title: english(item.professional_title),
      biography: english(item.short_intro),
      specialties: Array.isArray(item.specialties) ? item.specialties.map(String) : [],
      languages: Array.isArray(item.languages) ? item.languages.map(String) : [],
      serviceIds: (eligibilityRows ?? []).filter((entry) => entry.barber_profile_id === item.id).map((entry) => entry.service_id),
      demo: Boolean(item.demo),
    };
  }).filter((barber) => barber.serviceIds.length > 0);
  if (!catalogBarbers.length) throw new BookingCatalogError("NO_BOOKABLE_BARBERS");

  return {
    admin,
    catalog: {
      source: "supabase",
      location: {
        id: location.id,
        name: location.name,
        timezone: location.timezone,
        address: [location.address_line_1, location.city, location.region, location.postal_code].filter(Boolean).join(", "),
      },
      categories,
      services: catalogServices,
      addons: (addonRows ?? []).map((item) => ({ id: item.id, slug: item.slug, serviceId: item.service_id, name: english(item.name), description: english(item.description), durationMinutes: Number(item.duration_minutes), priceCents: Number(item.price_cents) })),
      barbers: catalogBarbers,
    },
  };
}
