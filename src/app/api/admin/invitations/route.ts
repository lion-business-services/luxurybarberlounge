import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { isAppRole } from "@/lib/auth/config";
import { getEmailProvider } from "@/lib/notifications/providers";

const inviteSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["barber", "receptionist", "manager"]),
  locationId: z.string().uuid().nullable().optional(),
  expiresInDays: z.number().int().min(1).max(365).default(7),
  barberProfileId: z.string().uuid().nullable().optional(),
});

async function ownerContext() {
  const session = await getServerAuthSession();
  if (!session.user || !session.roles.some((role) => role === "owner" || role === "super_admin")) return null;
  const admin = createUntypedAdminSupabase();
  if (!admin) return { session, admin: null, businessId: null };
  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  return { session, admin, businessId: typeof business?.id === "string" ? business.id : null };
}

export async function GET() {
  const context = await ownerContext();
  if (!context) return NextResponse.json({ ok: false, message: "Owner access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });

  const [{ data: invitations, error: invitationError }, userResult, { data: roleRows }] = await Promise.all([
    context.admin.from("user_invitations").select("id,email,intended_role,status,expires_at,created_at,accepted_at,barber_profile_id").eq("business_id", context.businessId).order("created_at", { ascending: false }).limit(100),
    context.admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
    context.admin.from("user_roles").select("user_id,roles!inner(key)").eq("business_id", context.businessId),
  ]);
  if (invitationError) return NextResponse.json({ ok: false, message: "Invitations could not be loaded." }, { status: 500 });

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const related = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
    const keys = related.map((item) => String((item as { key?: string }).key ?? "")).filter((value) => isAppRole(value));
    rolesByUser.set(String(row.user_id), keys);
  }

  const users = (userResult.data?.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? "",
    lastSignInAt: user.last_sign_in_at ?? null,
    createdAt: user.created_at,
    roles: rolesByUser.get(user.id) ?? [],
  })).filter((user) => user.roles.length > 0);

  return NextResponse.json({ ok: true, invitations: invitations ?? [], users });
}

export async function POST(request: NextRequest) {
  const context = await ownerContext();
  if (!context) return NextResponse.json({ ok: false, message: "Owner access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid email and staff role." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  let barberProfileId = parsed.data.role === "barber" ? parsed.data.barberProfileId ?? null : null;
  if (parsed.data.role === "barber" && !barberProfileId) {
    const { data: mappedProfile } = await context.admin
      .from("barber_profiles")
      .select("id")
      .eq("business_id", context.businessId)
      .eq("portal_email", email)
      .maybeSingle();
    barberProfileId = typeof mappedProfile?.id === "string" ? mappedProfile.id : null;
  }
  if (barberProfileId) {
    const { data: validProfile } = await context.admin
      .from("barber_profiles")
      .select("id")
      .eq("business_id", context.businessId)
      .eq("id", barberProfileId)
      .maybeSingle();
    if (!validProfile?.id) return NextResponse.json({ ok: false, message: "The selected barber profile is not available." }, { status: 422 });
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  await context.admin.from("user_invitations").update({ status: "revoked" }).eq("business_id", context.businessId).eq("email", email).eq("status", "pending");
  const { data: invitation, error } = await context.admin.from("user_invitations").insert({
    business_id: context.businessId,
    email,
    intended_role: parsed.data.role,
    location_id: parsed.data.locationId ?? null,
    invited_by: context.session.user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    barber_profile_id: barberProfileId,
  }).select("id").single();
  if (error || !invitation?.id) return NextResponse.json({ ok: false, message: "The invitation could not be created." }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com";
  const provider = getEmailProvider();
  const roleLabel = parsed.data.role.replaceAll("_", " ");
  let delivery: "accepted" | "development" | "failed" = "development";
  try {
    const result = await provider.send({
      recipient: email,
      subject: "Your Luxury Barber Lounge portal invitation",
      body: `You have been invited as ${roleLabel}. Open ${siteUrl}/login and request a six-digit access code using this email address. This invitation expires ${new Date(expiresAt).toLocaleString("en-US", { timeZone: "America/New_York" })}.`,
      html: `<div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#f5f0e6;padding:32px"><h1 style="font-family:Georgia,serif;color:#c79a35">Luxury Barber Lounge</h1><p>You have been invited as <strong>${roleLabel}</strong>.</p><p><a href="${siteUrl}/login" style="display:inline-block;background:#c79a35;color:#0a0a0a;padding:12px 20px;border-radius:999px;text-decoration:none">Request your access code</a></p><p>Use <strong>${email}</strong>. The portal will assign your authorized role only after the email code is verified.</p><p style="color:#b9b0a0;font-size:12px">801 Tilton Road, Suite 106, Northfield, NJ 08225 · 609-384-5171</p></div>`,
      idempotencyKey: `staff-invitation-${invitation.id}`,
    });
    delivery = result.status;
  } catch {
    delivery = "failed";
  }

  await context.admin.from("audit_logs").insert({
    business_id: context.businessId,
    actor_user_id: context.session.user.id,
    action: "staff_invitation_created",
    resource_type: "user_invitation",
    resource_id: invitation.id,
    metadata: { email, role: parsed.data.role, delivery, barber_profile_id: barberProfileId },
  });
  return NextResponse.json({ ok: true, invitationId: invitation.id, delivery });
}

export async function DELETE(request: NextRequest) {
  const context = await ownerContext();
  if (!context) return NextResponse.json({ ok: false, message: "Owner access is required." }, { status: 403 });
  if (!context.admin || !context.businessId) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ ok: false, message: "A valid invitation is required." }, { status: 400 });
  const { error } = await context.admin.from("user_invitations").update({ status: "revoked" }).eq("id", id).eq("business_id", context.businessId).eq("status", "pending");
  if (error) return NextResponse.json({ ok: false, message: "The invitation could not be revoked." }, { status: 500 });
  await context.admin.from("audit_logs").insert({ business_id: context.businessId, actor_user_id: context.session.user.id, action: "staff_invitation_revoked", resource_type: "user_invitation", resource_id: id, metadata: {} });
  return NextResponse.json({ ok: true });
}
