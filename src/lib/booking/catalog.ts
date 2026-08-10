import "server-only";
import { createPublicServerSupabase, createUntypedAdminSupabase } from "@/lib/auth/server";
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

const LEGACY_BARBER_SLUGS: Record<string, string> = {
  "amaya-reyes": "angelica-aquino",
  "adrian-cole": "hommy-rivera",
  "mateo-cruz": "barber-los",
  "julian-vega": "jose",
  "elias-moreno": "elvis",
  "nico-santos": "alfredo-hernandez-pollo",
  "marcus-bennett": "russ-hawkins",
  "andre-silva": "daniel-penalo",
};

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
    starting_price: Boolean(item.startingPrice),
    duration_minutes: item.minutes,
    deposit_cents: Math.round(item.deposit * 100),
    benefits: item.benefits,
    preparation: item.preparation,
    featured: Boolean(item.featured),
    bookable: true,
    content_status: "published",
    active: true,
    sort_order: index,
  })), { onConflict: "business_id,slug" }).select("id,slug,category_id,name,short_description,full_description,price_cents,duration_minutes,deposit_cents,active,bookable,content_status");
  requireResult(serviceError, "SERVICES_UNAVAILABLE");
  const serviceBySlug = new Map((serviceRows ?? []).map((item) => [item.slug, item]));
  const currentServiceSlugs = services.map((item) => item.slug);
  const staleServiceResult = await admin.from("services")
    .update({ active: false, bookable: false, content_status: "archived" })
    .eq("business_id", business.id)
    .not("slug", "in", `(${currentServiceSlugs.map((slug) => `"${slug}"`).join(",")})`);
  requireResult(staleServiceResult.error, "SERVICES_UNAVAILABLE");

  let addonRows: Array<{ id: string; slug: string; service_id: string | null; name: unknown; description: unknown; price_cents: number; duration_minutes: number }> = [];
  if (serviceAddOns.length) {
    const addonResult = await admin.from("service_addons").upsert(serviceAddOns.map((item) => ({
      business_id: business.id,
      service_id: null,
      slug: item.slug,
      name: item.name,
      description: { en: "Optional enhancement.", es: "Mejora opcional." },
      price_cents: Math.round(item.price * 100),
      duration_minutes: item.minutes,
      active: true,
    })), { onConflict: "business_id,slug" }).select("id,slug,service_id,name,description,price_cents,duration_minutes");
    requireResult(addonResult.error, "ADDONS_UNAVAILABLE");
    addonRows = addonResult.data ?? [];
    const currentAddonSlugs = serviceAddOns.map((item) => item.slug);
    const staleAddonResult = await admin.from("service_addons")
      .update({ active: false })
      .eq("business_id", business.id)
      .not("slug", "in", `(${currentAddonSlugs.map((slug) => `"${slug}"`).join(",")})`);
    requireResult(staleAddonResult.error, "ADDONS_UNAVAILABLE");
  } else {
    const staleAddonResult = await admin.from("service_addons").update({ active: false }).eq("business_id", business.id);
    requireResult(staleAddonResult.error, "ADDONS_UNAVAILABLE");
  }

  for (const [legacySlug, currentSlug] of Object.entries(LEGACY_BARBER_SLUGS)) {
    const source = barbers.find((item) => item.slug === currentSlug);
    if (!source) continue;
    const legacyLookup = await admin.from("barber_profiles")
      .select("id,slug")
      .eq("business_id", business.id)
      .in("slug", [legacySlug, currentSlug]);
    requireResult(legacyLookup.error, "BARBERS_UNAVAILABLE");
    const legacy = (legacyLookup.data ?? []).find((item) => item.slug === legacySlug);
    const current = (legacyLookup.data ?? []).find((item) => item.slug === currentSlug);
    if (!legacy) continue;
    const legacyUpdate = current
      ? await admin.from("barber_profiles").update({
          slug: `legacy-identity-${String(legacy.id).replaceAll("-", "").slice(0, 16)}`,
          display_name: source.name,
          active: false,
          featured: false,
          status: "archived",
        }).eq("id", legacy.id)
      : await admin.from("barber_profiles").update({
          slug: source.slug,
          display_name: source.name,
        }).eq("id", legacy.id);
    requireResult(legacyUpdate.error, "BARBERS_UNAVAILABLE");
  }

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
    languages: item.languageCodes ?? item.languages.split("·").map((value) => value.trim().toLowerCase()).filter(Boolean),
    social_links: item.socialStatus === "active" && item.socialUrl
      ? { instagram: item.socialUrl, instagramHandle: item.instagramHandle }
      : { instagramStatus: item.socialStatus, instagramHandle: item.instagramHandle ?? null },
    featured: Boolean(item.featured),
    active: true,
    demo: false,
    status: "published",
    sort_order: item.sortOrder,
  })), { onConflict: "business_id,slug" });
  requireResult(barberUpsert.error, "BARBERS_UNAVAILABLE");

  const currentBarberSlugs = verifiedSourceBarbers.map((item) => item.slug);
  const staleBarberResult = await admin.from("barber_profiles")
    .update({ active: false })
    .eq("business_id", business.id)
    .not("slug", "in", `(${currentBarberSlugs.map((slug) => `"${slug}"`).join(",")})`);
  requireResult(staleBarberResult.error, "BARBERS_UNAVAILABLE");

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
  const today = isoDate();

  // Owner-managed schedules are operational data. Catalog reads must never erase
  // them. Default rows are inserted only for a barber who has no active schedule.
  const currentScheduleResult = await admin
    .from("barber_schedules")
    .select("barber_profile_id,weekday")
    .in("barber_profile_id", liveBarberIds)
    .eq("location_id", location.id)
    .eq("active", true)
    .or(`effective_to.is.null,effective_to.gte.${today}`);
  requireResult(currentScheduleResult.error, "BARBER_SCHEDULES_UNAVAILABLE");
  const barbersWithSchedules = new Set((currentScheduleResult.data ?? []).map((item) => String(item.barber_profile_id)));

  const hourByWeekday = new Map(businessConfig.hours.map((item) => [item.weekday, item]));
  const scheduleRows = verifiedSourceBarbers.flatMap((sourceBarber) => {
    const row = (barberRows ?? []).find((item) => item.slug === sourceBarber.slug);
    if (!row || barbersWithSchedules.has(String(row.id))) return [];
    return sourceBarber.bookingWeekdays.flatMap((weekday) => {
      const businessHour = hourByWeekday.get(weekday);
      if (!businessHour || businessHour.closed) return [];
      return [{
        barber_user_id: row.staff_user_id ?? null,
        barber_profile_id: row.id,
        location_id: location.id,
        weekday,
        starts_at: businessHour.open,
        ends_at: businessHour.close,
        active: true,
        effective_from: today,
        effective_to: null,
      }];
    });
  });
  if (scheduleRows.length) {
    const scheduleInsert = await admin.from("barber_schedules").upsert(scheduleRows, { onConflict: "barber_profile_id,location_id,weekday,effective_from" });
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
  const scheduledBarberIds = new Set((scheduleCheck ?? []).map((item) => String(item.barber_profile_id)));
  const eligibleServiceIds = new Set((eligibilityRows ?? [])
    .filter((item) => scheduledBarberIds.has(String(item.barber_profile_id)))
    .map((item) => String(item.service_id)));
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
      portrait: source?.image.booking ?? null,
      portraitAvif: source?.image.bookingAvif ?? null,
      portraitJpeg: source?.image.bookingJpeg ?? null,
      portraitPosition: source?.image.objectPosition.booking ?? "50% 20%",
      title: english(item.professional_title),
      biography: english(item.short_intro),
      specialties: Array.isArray(item.specialties) ? item.specialties.map(String) : [],
      languages: Array.isArray(item.languages) ? item.languages.map(String) : [],
      serviceIds: (eligibilityRows ?? []).filter((entry) => entry.barber_profile_id === item.id).map((entry) => entry.service_id),
      demo: Boolean(item.demo),
      bookable: scheduledBarberIds.has(String(item.id)),
      availabilityNote: source?.availability.en ?? "Contact the lounge for availability.",
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


type PublicCatalogRpc = {
  location?: { id?: string; name?: string; timezone?: string; address?: string };
  categories?: Array<{ id?: string; slug?: string; name?: unknown; description?: unknown }>;
  services?: Array<{ id?: string; slug?: string; category_id?: string | null; name?: unknown; short_description?: unknown; full_description?: unknown; price_cents?: number; duration_minutes?: number; deposit_cents?: number }>;
  addons?: Array<{ id?: string; slug?: string; service_id?: string | null; name?: unknown; description?: unknown; price_cents?: number; duration_minutes?: number }>;
  barbers?: Array<{ id?: string; slug?: string; display_name?: unknown; professional_title?: unknown; short_intro?: unknown; specialties?: unknown; languages?: unknown; service_ids?: unknown; bookable?: boolean; demo?: boolean }>;
};

function publicCatalogFromRpc(payload: PublicCatalogRpc): BookingCatalog {
  if (!payload.location?.id || !payload.location.timezone) throw new BookingCatalogError("LOCATION_NOT_CONFIGURED");
  const categories = (payload.categories ?? []).flatMap((item) => item.id && item.slug ? [{ id: item.id, slug: item.slug, name: english(item.name), description: english(item.description) }] : []);
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const catalogServices = (payload.services ?? []).flatMap((item) => item.id && item.slug ? [{
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
  }] : []);
  if (!catalogServices.length) throw new BookingCatalogError("NO_BOOKABLE_SERVICES");
  const catalogBarbers = (payload.barbers ?? []).flatMap((item) => {
    if (!item.id || !item.slug) return [];
    const source = barbers.find((barber) => barber.slug === item.slug);
    const serviceIds = Array.isArray(item.service_ids) ? item.service_ids.map(String) : [];
    if (!serviceIds.length) return [];
    return [{
      id: item.id,
      slug: item.slug,
      name: english(item.display_name),
      portrait: source?.image.booking ?? null,
      portraitAvif: source?.image.bookingAvif ?? null,
      portraitJpeg: source?.image.bookingJpeg ?? null,
      portraitPosition: source?.image.objectPosition.booking ?? "50% 20%",
      title: english(item.professional_title),
      biography: english(item.short_intro),
      specialties: Array.isArray(item.specialties) ? item.specialties.map(String) : [],
      languages: Array.isArray(item.languages) ? item.languages.map(String) : [],
      serviceIds,
      demo: Boolean(item.demo),
      bookable: Boolean(item.bookable),
      availabilityNote: source?.availability.en ?? "Contact the lounge for availability.",
    }];
  });
  if (!catalogBarbers.length) throw new BookingCatalogError("NO_BOOKABLE_BARBERS");
  return {
    source: "supabase",
    location: { id: payload.location.id, name: payload.location.name ?? "Northfield Lounge", timezone: payload.location.timezone, address: payload.location.address ?? [businessConfig.address.line1, businessConfig.address.city, businessConfig.address.region, businessConfig.address.postalCode].filter(Boolean).join(", ") },
    categories,
    services: catalogServices,
    addons: (payload.addons ?? []).flatMap((item) => item.id && item.slug ? [{ id: item.id, slug: item.slug, serviceId: item.service_id ?? null, name: english(item.name), description: english(item.description), durationMinutes: Number(item.duration_minutes ?? 0), priceCents: Number(item.price_cents ?? 0) }] : []),
    barbers: catalogBarbers,
  };
}

/** Read-only public catalog path. Normal booking-page loads never require the service-role key. */
export async function readPublicBookingCatalog(): Promise<BookingCatalog> {
  const client = createPublicServerSupabase();
  if (!client) throw new BookingCatalogError("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await client.rpc("get_public_booking_catalog");
  if (error || !data) {
    console.error("booking-public-catalog", { code: error?.code, message: error?.message?.slice(0, 240) });
    throw new BookingCatalogError("BOOKING_MIGRATIONS_REQUIRED");
  }
  return publicCatalogFromRpc(data as PublicCatalogRpc);
}

export async function getBookingCatalog(): Promise<BookingCatalog> {
  try {
    return await readPublicBookingCatalog();
  } catch (publicError) {
    if (!createUntypedAdminSupabase()) throw publicError;
    const { catalog } = await ensureBookingCatalog();
    return catalog;
  }
}

export async function getBookingAdminContext() {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new BookingCatalogError("SUPABASE_ADMIN_NOT_CONFIGURED");
  return { admin, catalog: await getBookingCatalog() };
}
