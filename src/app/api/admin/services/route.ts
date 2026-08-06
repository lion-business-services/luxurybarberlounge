import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";

const allowed = new Set(["manager", "owner", "super_admin"]);
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).nullable().optional(),
  depositCents: z.number().int().min(0).nullable().optional(),
  bookable: z.boolean().default(true),
});
const updateSchema = createSchema.partial().extend({ id: z.string().uuid(), active: z.boolean().optional() });

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function context() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => allowed.has(role))) return null;
  const admin = createUntypedAdminSupabase();
  if (!admin) return { session, admin: null, businessId: null };
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  return { session, admin, businessId: business?.id ? String(business.id) : null };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ ok: false, message: "Operations access is required." }, { status: 403 });
  if (!ctx.admin || !ctx.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await ctx.admin.from("services").select("id,slug,name,short_description,price_cents,duration_minutes,deposit_cents,bookable,active,content_status,square_catalog_id").eq("business_id", ctx.businessId).order("sort_order").order("created_at");
  if (error) return NextResponse.json({ ok: false, message: "Services could not be loaded." }, { status: 500 });
  return NextResponse.json({ ok: true, services: data ?? [] });
}

export async function POST(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ ok: false, message: "Operations access is required." }, { status: 403 });
  if (!ctx.admin || !ctx.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a service name and valid pricing details." }, { status: 400 });
  const slug = slugify(parsed.data.name);
  const { data, error } = await ctx.admin.from("services").insert({
    business_id: ctx.businessId,
    slug,
    name: { en: parsed.data.name, es: parsed.data.name },
    short_description: { en: parsed.data.description ?? "", es: parsed.data.description ?? "" },
    price_cents: parsed.data.priceCents ?? null,
    duration_minutes: parsed.data.durationMinutes ?? null,
    deposit_cents: parsed.data.depositCents ?? null,
    bookable: parsed.data.bookable,
    content_status: "published",
    active: true,
  }).select("id").single();
  if (error || !data?.id) return NextResponse.json({ ok: false, message: error?.code === "23505" ? "A service with this name already exists." : "The service could not be created." }, { status: 500 });
  await ctx.admin.from("audit_logs").insert({ business_id: ctx.businessId, actor_user_id: ctx.session.user.id, actor_role: ctx.session.roles[0] ?? null, action: "service_created", resource_type: "service", resource_id: data.id, after_data: parsed.data, metadata: {} });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ ok: false, message: "Operations access is required." }, { status: 403 });
  if (!ctx.admin || !ctx.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter valid service changes." }, { status: 400 });
  const { id, name, description, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  if (name !== undefined) { update.name = { en: name, es: name }; update.slug = slugify(name); }
  if (description !== undefined) update.short_description = { en: description, es: description };
  const { error } = await ctx.admin.from("services").update(update).eq("business_id", ctx.businessId).eq("id", id);
  if (error) return NextResponse.json({ ok: false, message: "The service could not be updated." }, { status: 500 });
  await ctx.admin.from("audit_logs").insert({ business_id: ctx.businessId, actor_user_id: ctx.session.user.id, actor_role: ctx.session.roles[0] ?? null, action: "service_updated", resource_type: "service", resource_id: id, after_data: update, metadata: {} });
  return NextResponse.json({ ok: true });
}
