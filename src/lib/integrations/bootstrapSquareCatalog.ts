import "server-only";

import { createHash } from "node:crypto";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareRequest } from "@/lib/square/client";
import { squareConfig } from "@/lib/square/config";

function englishName(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.en === "string") return record.en.trim();
    if (typeof record.es === "string") return record.es.trim();
  }
  return "";
}

function normalize(value: unknown) {
  return typeof value === "string"
    ? value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
}

function stableKey(prefix: string, values: string[]) {
  return createHash("sha256")
    .update(`${prefix}:${values.slice().sort().join(":")}`)
    .digest("hex");
}

type CatalogVariation = {
  id?: string;
  item_variation_data?: {
    available_for_booking?: boolean;
  };
};

type CatalogItem = {
  item_data?: {
    name?: string;
    variations?: CatalogVariation[];
  };
};

type IdMapping = {
  client_object_id?: string;
  object_id?: string;
};

/**
 * Creates only website services that do not already exist in Square as an
 * exact normalized appointment-service name. Existing Square objects are never
 * replaced or deleted.
 *
 * This is intentionally a one-way bootstrap. Normal synchronization remains in
 * syncSquareFoundation after the missing Square objects exist.
 */
export async function bootstrapSquareCatalog() {
  const admin = createUntypedAdminSupabase();
  if (!admin) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  if (!squareConfig.accessToken || !squareConfig.locationId) {
    throw new Error("SQUARE_NOT_CONFIGURED");
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", "luxury-barber-lounge")
    .maybeSingle();
  if (businessError || !business?.id) throw new Error("BUSINESS_NOT_CONFIGURED");

  const businessId = String(business.id);

  const [{ data: services, error: servicesError }, catalogResponse, teamResponse] =
    await Promise.all([
      admin
        .from("services")
        .select("id,slug,name,price_cents,duration_minutes,square_catalog_id")
        .eq("business_id", businessId)
        .eq("active", true)
        .eq("bookable", true),
      squareRequest<{ items?: CatalogItem[] }>("/v2/catalog/search-catalog-items", {
        method: "POST",
        body: {
          product_types: ["APPOINTMENTS_SERVICE"],
          enabled_location_ids: [squareConfig.locationId],
          limit: 100,
        },
      }),
      squareRequest<{
        team_members?: Array<{ id?: string; status?: string }>;
      }>("/v2/team-members/search", {
        method: "POST",
        body: {
          query: {
            filter: {
              location_ids: [squareConfig.locationId],
              status: "ACTIVE",
            },
          },
          limit: 200,
        },
      }),
    ]);

  if (servicesError) throw servicesError;

  const existingNames = new Set(
    (catalogResponse.items ?? [])
      .map((item) => normalize(item.item_data?.name))
      .filter(Boolean),
  );

  const localServices = (services ?? []).filter((service) => {
    const name = englishName(service.name);
    return name && !existingNames.has(normalize(name));
  });

  if (!localServices.length) {
    return {
      ok: true,
      createdServices: 0,
      message: "Square already contains every active website service by name.",
    };
  }

  const teamMemberIds = (teamResponse.team_members ?? [])
    .filter((member) => member.id && member.status !== "INACTIVE")
    .map((member) => String(member.id));

  const objects = localServices.map((service) => {
    const itemTempId = `#lbl-item-${service.slug}`;
    const variationTempId = `#lbl-var-${service.slug}`;
    const priceCents = Math.max(0, Number(service.price_cents ?? 0));
    const durationMinutes = Math.max(5, Number(service.duration_minutes ?? 30));

    return {
      type: "ITEM",
      id: itemTempId,
      present_at_location_ids: [squareConfig.locationId],
      item_data: {
        name: englishName(service.name),
        product_type: "APPOINTMENTS_SERVICE",
        variations: [
          {
            type: "ITEM_VARIATION",
            id: variationTempId,
            present_at_location_ids: [squareConfig.locationId],
            item_variation_data: {
              item_id: itemTempId,
              name: "Regular",
              pricing_type: "FIXED_PRICING",
              price_money: {
                amount: priceCents,
                currency: "USD",
              },
              service_duration: durationMinutes * 60_000,
              available_for_booking: true,
              ...(teamMemberIds.length ? { team_member_ids: teamMemberIds } : {}),
            },
          },
        ],
      },
    };
  });

  const response = await squareRequest<{
    id_mappings?: IdMapping[];
    errors?: unknown[];
  }>("/v2/catalog/batch-upsert", {
    method: "POST",
    idempotencyKey: stableKey(
      `lbl-catalog-${squareConfig.environment}`,
      localServices.map((service) => String(service.id)),
    ),
    body: {
      batches: [{ objects }],
    },
  });

  const mappingByClientId = new Map(
    (response.id_mappings ?? [])
      .filter((mapping) => mapping.client_object_id && mapping.object_id)
      .map((mapping) => [String(mapping.client_object_id), String(mapping.object_id)]),
  );

  let mappedServices = 0;
  for (const service of localServices) {
    const variationId = mappingByClientId.get(`#lbl-var-${service.slug}`);
    if (!variationId) continue;

    const { error } = await admin
      .from("services")
      .update({ square_catalog_id: variationId })
      .eq("business_id", businessId)
      .eq("id", service.id);
    if (error) throw error;
    mappedServices += 1;
  }

  return {
    ok: true,
    createdServices: localServices.length,
    mappedServices,
    squareTeamMembersAssigned: teamMemberIds.length,
    errors: response.errors ?? [],
  };
}
