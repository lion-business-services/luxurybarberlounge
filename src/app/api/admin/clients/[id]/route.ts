import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";

const patchSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  preferredLanguage: z.enum(["en", "es"]).optional(),
  marketingStatus: z.enum(["unknown", "subscribed", "unsubscribed"]).optional(),
  groomingPreferences: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).optional(),
  accountStatus: z.enum(["active", "invited", "suspended"]).optional(),
});
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add_note"), note: z.string().trim().min(1).max(5000), visibility: z.enum(["internal", "client"]).default("internal") }),
  z.object({ action: z.literal("add_tag"), tag: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal("remove_tag"), tag: z.string().trim().min(1).max(60) }),
]);

async function ownedClient(context: NonNullable<Awaited<ReturnType<typeof getAdminBusinessContext>>>, id: string) {
  if (!context.admin || !context.businessId) return null;
  const { data } = await context.admin.from("client_profiles").select("user_id,marketing_status,grooming_preferences").eq("business_id", context.businessId).eq("user_id", id).maybeSingle();
  return data;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminBusinessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Administrative access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { id } = await params;
  const client = await ownedClient(context, id);
  if (!client) return NextResponse.json({ ok: false, message: "Client not found in this business." }, { status: 404 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Review the client changes and try again." }, { status: 400 });
  if (parsed.data.accountStatus && !context.session.roles.some((role) => role === "owner" || role === "super_admin")) return NextResponse.json({ ok: false, message: "Only the owner can change account status." }, { status: 403 });
  const { data: previousProfile } = await context.admin.from("profiles").select("full_name,phone,preferred_language,status").eq("id", id).maybeSingle();
  const profileUpdate: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) profileUpdate.full_name = parsed.data.fullName;
  if (parsed.data.phone !== undefined) profileUpdate.phone = parsed.data.phone;
  if (parsed.data.preferredLanguage !== undefined) profileUpdate.preferred_language = parsed.data.preferredLanguage;
  if (parsed.data.accountStatus !== undefined) profileUpdate.status = parsed.data.accountStatus;
  if (Object.keys(profileUpdate).length) {
    const { error } = await context.admin.from("profiles").update(profileUpdate).eq("id", id);
    if (error) return NextResponse.json({ ok: false, message: "Client identity fields could not be updated." }, { status: 500 });
  }
  const clientUpdate: Record<string, unknown> = {};
  if (parsed.data.marketingStatus !== undefined) clientUpdate.marketing_status = parsed.data.marketingStatus;
  if (parsed.data.groomingPreferences !== undefined) clientUpdate.grooming_preferences = parsed.data.groomingPreferences;
  if (Object.keys(clientUpdate).length) {
    const { error } = await context.admin.from("client_profiles").update(clientUpdate).eq("business_id", context.businessId).eq("user_id", id);
    if (error) return NextResponse.json({ ok: false, message: "Client preferences could not be updated." }, { status: 500 });
  }
  await context.admin.from("client_history_events").insert({ business_id: context.businessId, client_user_id: id, event_type: "profile_updated", source: "admin_crm", source_id: context.session.user.id, summary: { changed_fields: Object.keys(parsed.data) }, client_visible: false });
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "client_profile_updated", resource_type: "client_profile", resource_id: id, before_data: { profile: previousProfile, client }, after_data: parsed.data, metadata: {} });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminBusinessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Administrative access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { id } = await params;
  if (!await ownedClient(context, id)) return NextResponse.json({ ok: false, message: "Client not found in this business." }, { status: 404 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Select a valid client action." }, { status: 400 });
  if (parsed.data.action === "add_note") {
    const { data, error } = await context.admin.from("client_notes").insert({ business_id: context.businessId, client_user_id: id, author_user_id: context.session.user.id, note: parsed.data.note, visibility: parsed.data.visibility }).select("id").single();
    if (error || !data?.id) return NextResponse.json({ ok: false, message: "The note could not be saved." }, { status: 500 });
    await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "client_note_added", resource_type: "client_note", resource_id: data.id, metadata: { client_user_id: id, visibility: parsed.data.visibility } });
    return NextResponse.json({ ok: true, id: data.id });
  }
  if (parsed.data.action === "add_tag") {
    const { error } = await context.admin.from("client_tags").upsert({ business_id: context.businessId, client_user_id: id, tag: parsed.data.tag, assigned_by: context.session.user.id }, { onConflict: "business_id,client_user_id,tag" });
    if (error) return NextResponse.json({ ok: false, message: "The tag could not be saved." }, { status: 500 });
  } else {
    const { error } = await context.admin.from("client_tags").delete().eq("business_id", context.businessId).eq("client_user_id", id).eq("tag", parsed.data.tag);
    if (error) return NextResponse.json({ ok: false, message: "The tag could not be removed." }, { status: 500 });
  }
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: parsed.data.action === "add_tag" ? "client_tag_added" : "client_tag_removed", resource_type: "client_profile", resource_id: id, metadata: { tag: parsed.data.tag } });
  return NextResponse.json({ ok: true });
}
