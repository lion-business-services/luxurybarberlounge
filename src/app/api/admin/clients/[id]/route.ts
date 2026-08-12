import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";

const patchSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  preferredLanguage: z.enum(["en", "es"]).optional(),
  marketingStatus: z.enum(["unknown", "subscribed", "unsubscribed"]).optional(),
  groomingPreferences: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean()])).optional(),
  accountStatus: z.enum(["active", "inactive", "blocked"]).optional(),
});
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add_note"), note: z.string().trim().min(1).max(5000), visibility: z.enum(["internal", "client"]).default("internal") }),
  z.object({ action: z.literal("add_tag"), tag: z.string().trim().min(1).max(60) }),
  z.object({ action: z.literal("remove_tag"), tag: z.string().trim().min(1).max(60) }),
]);

async function ownedClient(context: NonNullable<Awaited<ReturnType<typeof getAdminBusinessContext>>>, id: string) {
  if (!context.admin || !context.businessId) return null;
  const { data } = await context.admin.from("clients").select("id,auth_user_id,first_name,last_name,phone,preferred_language,status,communication_preferences,grooming_preferences").eq("business_id", context.businessId).eq("id", id).maybeSingle();
  return data;
}
function splitName(value: string) {
  const parts = value.trim().replace(/\s+/g, " ").split(" ");
  return { firstName: parts.shift() || "Client", lastName: parts.join(" ") || "" };
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

  const update: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) {
    const names = splitName(parsed.data.fullName);
    update.first_name = names.firstName;
    update.last_name = names.lastName;
  }
  if (parsed.data.phone !== undefined) update.phone = parsed.data.phone;
  if (parsed.data.preferredLanguage !== undefined) update.preferred_language = parsed.data.preferredLanguage;
  if (parsed.data.accountStatus !== undefined) update.status = parsed.data.accountStatus;
  if (parsed.data.groomingPreferences !== undefined) update.grooming_preferences = parsed.data.groomingPreferences;
  if (parsed.data.marketingStatus !== undefined) {
    const current = client.communication_preferences && typeof client.communication_preferences === "object" ? client.communication_preferences as Record<string, unknown> : {};
    update.communication_preferences = { ...current, marketingStatus: parsed.data.marketingStatus };
  }
  if (Object.keys(update).length) {
    const { error } = await context.admin.from("clients").update(update).eq("business_id", context.businessId).eq("id", id);
    if (error) return NextResponse.json({ ok: false, message: "Client fields could not be updated." }, { status: 500 });
  }

  const authUserId = typeof client.auth_user_id === "string" ? client.auth_user_id : null;
  if (authUserId) {
    const profileUpdate: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) profileUpdate.full_name = parsed.data.fullName;
    if (parsed.data.phone !== undefined) profileUpdate.phone = parsed.data.phone;
    if (parsed.data.preferredLanguage !== undefined) profileUpdate.preferred_language = parsed.data.preferredLanguage;
    if (Object.keys(profileUpdate).length) await context.admin.from("profiles").update(profileUpdate).eq("id", authUserId);
    const legacyUpdate: Record<string, unknown> = {};
    if (parsed.data.marketingStatus !== undefined) legacyUpdate.marketing_status = parsed.data.marketingStatus;
    if (parsed.data.groomingPreferences !== undefined) legacyUpdate.grooming_preferences = parsed.data.groomingPreferences;
    if (Object.keys(legacyUpdate).length) await context.admin.from("client_profiles").update(legacyUpdate).eq("business_id", context.businessId).eq("user_id", authUserId);
    await context.admin.from("client_history_events").insert({ business_id: context.businessId, client_user_id: authUserId, event_type: "profile_updated", source: "admin_crm", source_id: context.session.user.id, summary: { modern_client_id: id, changed_fields: Object.keys(parsed.data) }, client_visible: false });
  }
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "client_record_updated", resource_type: "client", resource_id: id, before_data: client, after_data: parsed.data, metadata: { auth_user_id: authUserId } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdminBusinessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Administrative access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const { id } = await params;
  const client = await ownedClient(context, id);
  if (!client) return NextResponse.json({ ok: false, message: "Client not found in this business." }, { status: 404 });
  const authUserId = typeof client.auth_user_id === "string" ? client.auth_user_id : null;
  if (!authUserId) return NextResponse.json({ ok: false, message: "Notes and tags become available after this guest client verifies a portal account." }, { status: 409 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Select a valid client action." }, { status: 400 });
  if (parsed.data.action === "add_note") {
    const { data, error } = await context.admin.from("client_notes").insert({ business_id: context.businessId, client_user_id: authUserId, author_user_id: context.session.user.id, note: parsed.data.note, visibility: parsed.data.visibility }).select("id").single();
    if (error || !data?.id) return NextResponse.json({ ok: false, message: "The note could not be saved." }, { status: 500 });
    await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "client_note_added", resource_type: "client_note", resource_id: data.id, metadata: { client_id: id, client_user_id: authUserId, visibility: parsed.data.visibility } });
    return NextResponse.json({ ok: true, id: data.id });
  }
  if (parsed.data.action === "add_tag") {
    const { error } = await context.admin.from("client_tags").upsert({ business_id: context.businessId, client_user_id: authUserId, tag: parsed.data.tag, assigned_by: context.session.user.id }, { onConflict: "business_id,client_user_id,tag" });
    if (error) return NextResponse.json({ ok: false, message: "The tag could not be saved." }, { status: 500 });
  } else {
    const { error } = await context.admin.from("client_tags").delete().eq("business_id", context.businessId).eq("client_user_id", authUserId).eq("tag", parsed.data.tag);
    if (error) return NextResponse.json({ ok: false, message: "The tag could not be removed." }, { status: 500 });
  }
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: parsed.data.action === "add_tag" ? "client_tag_added" : "client_tag_removed", resource_type: "client", resource_id: id, metadata: { tag: parsed.data.tag, client_user_id: authUserId } });
  return NextResponse.json({ ok: true });
}
