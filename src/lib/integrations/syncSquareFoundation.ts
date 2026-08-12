import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { squareRequest } from "@/lib/square/client";
import { squareConfig } from "@/lib/square/config";

type AnyRecord = Record<string, unknown>;

type SquareLocation = {
  id?: string;
  name?: string;
  status?: string;
  timezone?: string;
};

type SquareTeamMember = {
  id?: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
  status?: string;
};

type CatalogVariation = {
  id?: string;
  version?: number;
  item_variation_data?: {
    name?: string;
    available_for_booking?: boolean;
  };
};

type CatalogItem = {
  id?: string;
  version?: number;
  item_data?: {
    name?: string;
    variations?: CatalogVariation[];
  };
};

function normalize(value: unknown) {
  return typeof value === "string"
    ? value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
}

function localizedName(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.en === "string") return record.en;
    if (typeof record.es === "string") return record.es;
  }
  return "";
}

function fullName(member: SquareTeamMember) {
  return [member.given_name, member.family_name].filter(Boolean).join(" ").trim();
}

function unique<T>(values: T[]) {
  return values.length === 1 ? values[0] : null;
}

async function setSyncState(
  admin: NonNullable<ReturnType<typeof createUntypedAdminSupabase>>,
  businessId: string,
  resourceType: string,
  input: {
    status: "running" | "healthy" | "degraded" | "failed";
    error?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();
  await admin.from("square_sync_state").upsert(
    {
      business_id: businessId,
      resource_type: resourceType,
      status: input.status,
      last_synced_at: now,
      last_success_at: input.status === "healthy" ? now : undefined,
      last_error_at: input.error ? now : undefined,
      last_error: input.error ?? null,
      metadata: input.metadata ?? {},
    },
    { onConflict: "business_id,resource_type" },
  );
}

export async function syncSquareFoundation() {
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

  const { data: localLocation } = await admin
    .from("locations")
    .select("id,slug")
    .eq("business_id", businessId)
    .eq("slug", "northfield")
    .maybeSingle();

  const resources = ["locations", "team_members", "catalog"];
  await Promise.all(
    resources.map((resourceType) =>
      setSyncState(admin, businessId, resourceType, { status: "running" }),
    ),
  );

  try {
    const [locationsResponse, teamResponse, catalogResponse, localBarbersResult, localServicesResult] =
      await Promise.all([
        squareRequest<{ locations?: SquareLocation[] }>("/v2/locations"),
        squareRequest<{ team_members?: SquareTeamMember[] }>("/v2/team-members/search", {
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
        squareRequest<{ items?: CatalogItem[] }>("/v2/catalog/search-catalog-items", {
          method: "POST",
          body: {
            product_types: ["APPOINTMENTS_SERVICE"],
            enabled_location_ids: [squareConfig.locationId],
            limit: 100,
          },
        }),
        admin
          .from("barber_profiles")
          .select(
            "id,display_name,portal_email,square_team_member_id,staff_user_id,active,status",
          )
          .eq("business_id", businessId)
          .eq("active", true),
        admin
          .from("services")
          .select("id,name,square_catalog_id,active,bookable")
          .eq("business_id", businessId)
          .eq("active", true)
          .eq("bookable", true),
      ]);

    if (localBarbersResult.error) throw localBarbersResult.error;
    if (localServicesResult.error) throw localServicesResult.error;

    const configuredLocation = (locationsResponse.locations ?? []).find(
      (location) => location.id === squareConfig.locationId,
    );
    if (!configuredLocation?.id) throw new Error("SQUARE_LOCATION_NOT_FOUND");

    for (const location of locationsResponse.locations ?? []) {
      if (!location.id) continue;
      await admin.from("square_locations").upsert(
        {
          business_id: businessId,
          location_id:
            location.id === squareConfig.locationId && localLocation?.id
              ? localLocation.id
              : null,
          square_id: location.id,
          name: location.name ?? null,
          status: location.status ?? null,
          raw: location as unknown as AnyRecord,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "business_id,square_id" },
      );
    }

    const teamMembers = (teamResponse.team_members ?? []).filter((member) => member.id);
    const localBarbers = (localBarbersResult.data ?? []) as Array<Record<string, unknown>>;
    const claimedSquareIds = new Set(
      localBarbers
        .map((barber) => String(barber.square_team_member_id ?? ""))
        .filter(Boolean),
    );

    let barberMappings = 0;
    let unresolvedBarbers = 0;

    for (const barber of localBarbers) {
      const currentId = String(barber.square_team_member_id ?? "");
      let match = currentId
        ? teamMembers.find((member) => member.id === currentId) ?? null
        : null;

      if (!match) {
        const email = normalize(barber.portal_email);
        const byEmail = email
          ? teamMembers.filter((member) => normalize(member.email_address) === email)
          : [];
        match = unique(byEmail);
      }

      if (!match) {
        const display = normalize(barber.display_name);
        const byName = display
          ? teamMembers.filter((member) => normalize(fullName(member)) === display)
          : [];
        match = unique(byName);
      }

      if (match?.id && (!claimedSquareIds.has(match.id) || match.id === currentId)) {
        if (currentId !== match.id) {
          const { error: mappingError } = await admin
            .from("barber_profiles")
            .update({ square_team_member_id: match.id })
            .eq("business_id", businessId)
            .eq("id", barber.id);
          if (mappingError) throw mappingError;
        }
        claimedSquareIds.add(match.id);
        barberMappings += 1;
      } else {
        unresolvedBarbers += 1;
      }
    }

    const refreshedBarbersResult = await admin
      .from("barber_profiles")
      .select("id,staff_user_id,square_team_member_id")
      .eq("business_id", businessId)
      .eq("active", true);
    if (refreshedBarbersResult.error) throw refreshedBarbersResult.error;
    const refreshedBarbers = (refreshedBarbersResult.data ?? []) as Array<Record<string, unknown>>;
    const barberBySquareId = new Map(
      refreshedBarbers
        .filter((barber) => barber.square_team_member_id)
        .map((barber) => [String(barber.square_team_member_id), barber]),
    );

    for (const member of teamMembers) {
      if (!member.id) continue;
      const barber = barberBySquareId.get(member.id);
      await admin.from("square_team_members").upsert(
        {
          business_id: businessId,
          staff_user_id: barber?.staff_user_id ?? null,
          square_id: member.id,
          display_name: fullName(member) || null,
          status: member.status ?? null,
          raw: member as unknown as AnyRecord,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "business_id,square_id" },
      );
    }

    const catalogItems = catalogResponse.items ?? [];
    const localServices = (localServicesResult.data ?? []) as Array<Record<string, unknown>>;
    let serviceMappings = 0;
    let unresolvedServices = 0;

    for (const service of localServices) {
      const serviceName = localizedName(service.name);
      const matchingItems = catalogItems.filter(
        (item) => normalize(item.item_data?.name) === normalize(serviceName),
      );
      const bookableVariations = matchingItems
        .flatMap((item) => item.item_data?.variations ?? [])
        .filter(
          (variation) =>
            variation.id && variation.item_variation_data?.available_for_booking !== false,
        );
      const variation = unique(bookableVariations);
      if (!variation?.id) {
        unresolvedServices += 1;
        continue;
      }
      if (service.square_catalog_id !== variation.id) {
        const { error: serviceMappingError } = await admin
          .from("services")
          .update({ square_catalog_id: variation.id })
          .eq("business_id", businessId)
          .eq("id", service.id);
        if (serviceMappingError) throw serviceMappingError;
      }
      serviceMappings += 1;
    }

    const serviceBySquareId = new Map<string, string>();
    for (const service of localServices) {
      const squareId = String(service.square_catalog_id ?? "");
      if (squareId) serviceBySquareId.set(squareId, String(service.id));
    }
    for (const service of localServices) {
      const serviceName = localizedName(service.name);
      const matchingItems = catalogItems.filter(
        (item) => normalize(item.item_data?.name) === normalize(serviceName),
      );
      const bookableVariations = matchingItems
        .flatMap((item) => item.item_data?.variations ?? [])
        .filter(
          (variation) =>
            variation.id && variation.item_variation_data?.available_for_booking !== false,
        );
      const variation = unique(bookableVariations);
      if (variation?.id) serviceBySquareId.set(variation.id, String(service.id));
    }

    for (const item of catalogItems) {
      for (const variation of item.item_data?.variations ?? []) {
        if (!variation.id) continue;
        await admin.from("square_catalog_objects").upsert(
          {
            business_id: businessId,
            service_id: serviceBySquareId.get(variation.id) ?? null,
            addon_id: null,
            square_id: variation.id,
            object_type: "ITEM_VARIATION",
            version: variation.version ?? item.version ?? null,
            raw: variation as unknown as AnyRecord,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "business_id,square_id" },
        );
      }
    }

    const degraded = unresolvedBarbers > 0 || unresolvedServices > 0;
    const status = degraded ? "degraded" : "healthy";
    const now = new Date().toISOString();
    const summary = {
      squareLocationId: configuredLocation.id,
      squareLocationName: configuredLocation.name ?? null,
      teamMembers: teamMembers.length,
      barberMappings,
      unresolvedBarbers,
      catalogItems: catalogItems.length,
      serviceMappings,
      unresolvedServices,
    };

    await Promise.all([
      setSyncState(admin, businessId, "locations", {
        status: "healthy",
        metadata: {
          configuredLocationId: configuredLocation.id,
          configuredLocationName: configuredLocation.name ?? null,
        },
      }),
      setSyncState(admin, businessId, "team_members", {
        status,
        metadata: { total: teamMembers.length, mapped: barberMappings, unresolved: unresolvedBarbers },
      }),
      setSyncState(admin, businessId, "catalog", {
        status,
        metadata: {
          items: catalogItems.length,
          mappedServices: serviceMappings,
          unresolvedServices,
        },
      }),
      admin.from("integrations").upsert(
        {
          business_id: businessId,
          provider: "square",
          environment: squareConfig.environment,
          status,
          public_config: {
            location_id: squareConfig.locationId,
            api_version: squareConfig.apiVersion,
            application_id_configured: Boolean(squareConfig.applicationId),
            webhook_configured: Boolean(
              squareConfig.webhookSignatureKey && squareConfig.webhookNotificationUrl,
            ),
          },
          secret_reference: "SQUARE_ACCESS_TOKEN + SQUARE_WEBHOOK_SIGNATURE_KEY",
          last_checked_at: now,
          last_success_at: now,
          last_error_at: null,
          last_error: null,
          updated_at: now,
        },
        { onConflict: "business_id,provider,environment" },
      ),
    ]);

    return { ok: true, status, ...summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SQUARE_SYNC_FAILED";
    const now = new Date().toISOString();
    await Promise.all([
      ...resources.map((resourceType) =>
        setSyncState(admin, businessId, resourceType, {
          status: "failed",
          error: message,
        }),
      ),
      admin.from("integrations").upsert(
        {
          business_id: businessId,
          provider: "square",
          environment: squareConfig.environment,
          status: "failed",
          public_config: {
            location_id: squareConfig.locationId,
            api_version: squareConfig.apiVersion,
          },
          secret_reference: "SQUARE_ACCESS_TOKEN + SQUARE_WEBHOOK_SIGNATURE_KEY",
          last_checked_at: now,
          last_error_at: now,
          last_error: message,
          updated_at: now,
        },
        { onConflict: "business_id,provider,environment" },
      ),
      admin.from("sync_failures").insert({
        business_id: businessId,
        provider: "square",
        resource_type: "foundation_sync",
        error_code: message,
        message: "Square foundation synchronization failed.",
        details: { environment: squareConfig.environment },
        status: "open",
      }),
    ]);
    throw error;
  }
}
