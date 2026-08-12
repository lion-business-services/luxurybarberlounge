import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(""),
  priceCents: z.number().int().min(0).max(1_000_000).nullable(),
  billingInterval: z.enum(["week", "month", "quarter", "year", "one_time"]),
  benefits: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
});
const patchSchema = z.object({ planId: z.string().uuid(), action: z.enum(["archive", "publish", "unpublish", "map_square"]), squareCatalogId: z.string().trim().max(255).nullable().optional(), reason: z.string().trim().min(3).max(500) });
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70); }

export async function POST(request: NextRequest) {
  const context = await getAdminBusinessContext({ ownerOnly: true });
  if (!context) return NextResponse.json({ ok: false, message: "Owner access is required to create membership terms." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the membership plan details." }, { status: 400 });
  const slug = slugify(parsed.data.name);
  const { data: plan, error } = await context.admin.from("membership_plans").insert({
    business_id: context.businessId, slug, name: { en: parsed.data.name }, description: { en: parsed.data.description }, price_cents: parsed.data.priceCents ?? 0,
    billing_interval: parsed.data.billingInterval, benefits: parsed.data.benefits, active: false, demo: false, status: "draft",
  }).select("id").single();
  if (error || !plan?.id) return NextResponse.json({ ok: false, message: error?.code === "23505" ? "A plan with this name already exists." : "The plan could not be created." }, { status: 500 });
  await context.admin.from("membership_plan_versions").insert({ plan_id: plan.id, version: 1, name: { en: parsed.data.name }, description: { en: parsed.data.description }, price_cents: parsed.data.priceCents, billing_interval: parsed.data.billingInterval, benefits: parsed.data.benefits, status: "draft" });
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "membership_plan_created", resource_type: "membership_plan", resource_id: plan.id, after_data: parsed.data, metadata: { status: "draft" } });
  return NextResponse.json({ ok: true, planId: plan.id, status: "draft" });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminBusinessContext({ ownerOnly: true });
  if (!context) return NextResponse.json({ ok: false, message: "Owner access is required to change membership terms." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "A valid plan action and reason are required." }, { status: 400 });
  const { data: plan } = await context.admin.from("membership_plans").select("id,status,active,square_catalog_id").eq("business_id", context.businessId).eq("id", parsed.data.planId).maybeSingle();
  if (!plan?.id) return NextResponse.json({ ok: false, message: "Membership plan not found." }, { status: 404 });
  if (parsed.data.action === "map_square") {
    const squareCatalogId = parsed.data.squareCatalogId?.trim() || null;
    const { error } = await context.admin.from("membership_plans").update({ square_catalog_id: squareCatalogId }).eq("id", plan.id).eq("business_id", context.businessId);
    if (error) return NextResponse.json({ ok: false, message: "The Square membership mapping could not be saved." }, { status: 500 });
    await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "membership_plan_square_mapping_updated", resource_type: "membership_plan", resource_id: plan.id, before_data: { square_catalog_id: plan.square_catalog_id }, after_data: { square_catalog_id: squareCatalogId }, reason: parsed.data.reason, metadata: {} });
    return NextResponse.json({ ok: true, squareCatalogId });
  }
  if (parsed.data.action === "publish" && (!process.env.NEXT_PUBLIC_FEATURE_MEMBERSHIP_BILLING || process.env.NEXT_PUBLIC_FEATURE_MEMBERSHIP_BILLING !== "true" || !plan.square_catalog_id)) return NextResponse.json({ ok: false, message: "Connect the provider catalog and enable membership billing before publishing this plan." }, { status: 409 });
  const update = parsed.data.action === "archive" ? { active: false, status: "archived" } : parsed.data.action === "publish" ? { active: true, status: "published" } : { active: false, status: "draft" };
  const { error } = await context.admin.from("membership_plans").update(update).eq("id", plan.id).eq("business_id", context.businessId);
  if (error) return NextResponse.json({ ok: false, message: "The membership plan could not be updated." }, { status: 500 });
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: `membership_plan_${parsed.data.action}`, resource_type: "membership_plan", resource_id: plan.id, before_data: plan, after_data: update, reason: parsed.data.reason, metadata: {} });
  return NextResponse.json({ ok: true, status: update.status });
}
