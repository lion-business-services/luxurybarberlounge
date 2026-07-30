import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminBusinessContext } from "@/lib/auth/admin-context";
import { getEmailProvider } from "@/lib/notifications/providers";

const schema = z.object({ email: z.string().trim().email().max(254), fullName: z.string().trim().min(1).max(120), phone: z.string().trim().max(30).optional(), preferredLanguage: z.enum(["en", "es"]).default("en") });

export async function POST(request: NextRequest) {
  const context = await getAdminBusinessContext();
  if (!context) return NextResponse.json({ ok: false, message: "Administrative access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid client name and email." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const list = await context.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list.data?.users.find((item) => item.email?.toLowerCase() === email) ?? null;
  if (!user) {
    const created = await context.admin.auth.admin.createUser({ email, email_confirm: false, user_metadata: { full_name: parsed.data.fullName, source: "admin_crm" } });
    if (created.error || !created.data.user) return NextResponse.json({ ok: false, message: "The client identity could not be prepared." }, { status: 500 });
    user = created.data.user;
  }
  await context.admin.from("profiles").upsert({ id: user.id, full_name: parsed.data.fullName, display_name: parsed.data.fullName, phone: parsed.data.phone || null, preferred_language: parsed.data.preferredLanguage, status: "invited" }, { onConflict: "id" });
  await context.admin.from("client_profiles").upsert({ user_id: user.id, business_id: context.businessId }, { onConflict: "user_id" });
  const { data: role } = await context.admin.from("roles").select("id").eq("key", "client").maybeSingle();
  if (role?.id) {
    const { data: existingRole } = await context.admin.from("user_roles").select("id").eq("user_id", user.id).eq("role_id", role.id).eq("business_id", context.businessId).is("location_id", null).maybeSingle();
    if (!existingRole?.id) await context.admin.from("user_roles").insert({ user_id: user.id, role_id: role.id, business_id: context.businessId, assigned_by: context.session.user.id });
  }
  let delivery: string = "development";
  try {
    const result = await getEmailProvider().send({ recipient: email, subject: "Your Luxury Barber Lounge client portal", body: `Your secure client profile is ready. Visit https://www.theluxurybarberlounge.com/login and request a six-digit code using ${email}.`, html: `<div style="background:#0a0a0a;color:#f5f0e6;padding:32px;font-family:Arial,sans-serif"><h1 style="font-family:Georgia,serif;color:#c79a35">Luxury Barber Lounge</h1><p>Your secure client profile is ready.</p><p><a href="https://www.theluxurybarberlounge.com/login" style="display:inline-block;background:#c79a35;color:#090909;padding:12px 20px;border-radius:999px;text-decoration:none">Open client portal</a></p><p>Request a six-digit code using <strong>${email}</strong>. No password is required.</p></div>`, idempotencyKey: `client-portal-invite-${user.id}` });
    delivery = result.status;
  } catch { delivery = "failed"; }
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "client_profile_created", resource_type: "client_profile", resource_id: user.id, metadata: { email, delivery } });
  return NextResponse.json({ ok: true, clientId: user.id, delivery });
}
