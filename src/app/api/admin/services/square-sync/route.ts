import { NextResponse } from "next/server";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";
import { squareRequest } from "@/lib/square/client";
import { squareConfig } from "@/lib/square/config";

function name(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    return typeof map.en === "string" ? map.en : typeof map.es === "string" ? map.es : "";
  }
  return "";
}

function normalized(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

type CatalogVariation = { id?: string; item_variation_data?: { name?: string; available_for_booking?: boolean } };
type CatalogItem = { id?: string; item_data?: { name?: string; variations?: CatalogVariation[] } };

export async function POST() {
  const context = await getAdminBusinessContext({ ownerOnly: true });
  if (!context) return NextResponse.json({ ok: false, message: "Owner access is required to synchronize Square service mappings." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  if (!squareConfig.accessToken || !squareConfig.locationId) return NextResponse.json({ ok: false, message: "Square credentials and location ID must be configured before service synchronization." }, { status: 409 });

  const [catalog, localResult] = await Promise.all([
    squareRequest<{ items?: CatalogItem[] }>("/v2/catalog/search-catalog-items", {
      method: "POST",
      body: { product_types: ["APPOINTMENTS_SERVICE"], enabled_location_ids: [squareConfig.locationId], limit: 100 },
    }),
    context.admin.from("services").select("id,name,square_catalog_id").eq("business_id", context.businessId).eq("active", true).eq("bookable", true),
  ]);
  if (localResult.error) return NextResponse.json({ ok: false, message: "Local services could not be loaded." }, { status: 500 });

  const catalogItems = catalog.items ?? [];
  let matched = 0;
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const service of localResult.data ?? []) {
    const localName = name(service.name);
    const candidates = catalogItems.filter((item) => normalized(item.item_data?.name ?? "") === normalized(localName));
    const variations = candidates.flatMap((item) => item.item_data?.variations ?? []).filter((variation) => variation.id && variation.item_variation_data?.available_for_booking !== false);
    if (variations.length !== 1) {
      (variations.length > 1 ? ambiguous : unmatched).push(localName || String(service.id));
      continue;
    }
    const variationId = String(variations[0].id);
    if (service.square_catalog_id === variationId) { matched += 1; continue; }
    const { error } = await context.admin.from("services").update({ square_catalog_id: variationId }).eq("id", service.id).eq("business_id", context.businessId);
    if (error) { unmatched.push(localName || String(service.id)); continue; }
    matched += 1;
    await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "service_square_mapping_synchronized", resource_type: "service", resource_id: service.id, before_data: { square_catalog_id: service.square_catalog_id }, after_data: { square_catalog_id: variationId }, metadata: { match: "exact_service_name_single_bookable_variation" } });
  }

  return NextResponse.json({ ok: true, matched, unmatched, ambiguous, total: localResult.data?.length ?? 0 });
}
