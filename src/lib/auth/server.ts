import "server-only";
import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookies, isAppRole, roleHome, sanitizeNextPath } from "./config";
import type { AppRole } from "@/lib/supabase/types";

type RoleRow = { roles: { key: AppRole } | Array<{ key: AppRole }> | null };

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function createPublicServerSupabase() {
  const config = env();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createUntypedAdminSupabase() {
  const config = env();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) return null;
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function getRolesForUser(userId: string): Promise<AppRole[]> {
  const admin = createUntypedAdminSupabase();
  if (!admin) return [];
  const { data, error } = await admin
    .from("user_roles")
    .select("roles!inner(key)")
    .eq("user_id", userId);
  if (error || !data) return [];
  const roles = (data as unknown as RoleRow[]).flatMap((row) => {
    if (Array.isArray(row.roles)) return row.roles.map((item) => item.key);
    return row.roles?.key ? [row.roles.key] : [];
  });
  return [...new Set(roles)].filter(isAppRole);
}


async function consumePendingInvitation(user: User): Promise<AppRole | null> {
  const email = user.email?.trim().toLowerCase();
  const admin = createUntypedAdminSupabase();
  if (!email || !admin) return null;

  const now = new Date().toISOString();
  const { data: invitation } = await admin
    .from("user_invitations")
    .select("id,business_id,location_id,intended_role,expires_at")
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const intendedRole = isAppRole(invitation?.intended_role) ? invitation.intended_role : null;
  if (!invitation?.id || !invitation.business_id || !intendedRole) return null;

  const { data: role } = await admin.from("roles").select("id").eq("key", intendedRole).maybeSingle();
  if (!role?.id) return null;

  const { data: existingRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role_id", role.id)
    .eq("business_id", invitation.business_id)
    .is("location_id", null)
    .maybeSingle();
  if (!existingRole) {
    const { error: roleError } = await admin.from("user_roles").insert({
      user_id: user.id,
      role_id: role.id,
      business_id: invitation.business_id,
      location_id: null,
    });
    if (roleError && roleError.code !== "23505") throw roleError;
  }

  if (intendedRole !== "client") {
    const { error: staffError } = await admin.from("staff_profiles").upsert({
      user_id: user.id,
      business_id: invitation.business_id,
      location_id: invitation.location_id ?? null,
      professional_title: intendedRole === "barber" ? "Independent Barber" : intendedRole.replaceAll("_", " "),
      active: true,
    }, { onConflict: "user_id" });
    if (staffError) throw staffError;
  }

  const { error: invitationError } = await admin.from("user_invitations").update({
    status: "accepted",
    accepted_by: user.id,
    accepted_at: now,
  }).eq("id", invitation.id).eq("status", "pending");
  if (invitationError) throw invitationError;

  await admin.from("auth_audit").insert({
    user_id: user.id,
    event_type: "staff_invitation_accepted",
    outcome: "success",
    metadata: { invitation_id: invitation.id, role: intendedRole },
  });
  return intendedRole;
}

export async function ensureDefaultRole(user: User) {
  const admin = createUntypedAdminSupabase();
  if (!admin) return [] as AppRole[];
  const existing = await getRolesForUser(user.id);
  const ownerEmail = process.env.INITIAL_OWNER_EMAIL?.trim().toLowerCase();
  const verifiedEmail = user.email?.trim().toLowerCase();
  const invitedRole = await consumePendingInvitation(user);
  const desired: AppRole = ownerEmail && verifiedEmail === ownerEmail ? "owner" : invitedRole ?? "client";

  if (!existing.includes(desired)) {
    const { data: role } = await admin
      .from("roles")
      .select("id")
      .eq("key", desired)
      .maybeSingle();

    let businessId: string | null = null;
    if (desired !== "client") {
      const { data: business } = await admin
        .from("businesses")
        .select("id")
        .eq("slug", "luxury-barber-lounge")
        .maybeSingle();
      businessId = typeof business?.id === "string" ? business.id : null;
    }

    if (role?.id) {
      let scoped = admin
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role_id", role.id);
      scoped = businessId === null ? scoped.is("business_id", null) : scoped.eq("business_id", businessId);
      const { data: assigned } = await scoped.maybeSingle();

      if (!assigned) {
        const { error } = await admin.from("user_roles").insert({
          user_id: user.id,
          role_id: role.id,
          business_id: businessId,
        });
        if (error && error.code !== "23505") throw error;
      }
    }
  }

  const roles = await getRolesForUser(user.id);
  await admin.from("auth_audit").insert({
    user_id: user.id,
    event_type: "otp_verified",
    outcome: "success",
    metadata: { roles, owner_bootstrap_match: desired === "owner" },
  });
  return roles.length ? roles : [desired];
}

export async function getServerAuthSession() {
  if (process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE === "true") {
    return { user: null, roles: ["owner"] as AppRole[], activeRole: "owner" as AppRole, demo: true };
  }
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.accessToken)?.value;
  const refreshToken = cookieStore.get(authCookies.refreshToken)?.value;
  if (!accessToken) return { user: null, roles: [] as AppRole[], activeRole: null, refreshToken };
  const supabase = createPublicServerSupabase();
  if (!supabase) return { user: null, roles: [] as AppRole[], activeRole: null, refreshToken };
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return { user: null, roles: [] as AppRole[], activeRole: null, refreshToken };
  const roles = await getRolesForUser(data.user.id);
  const selected = cookieStore.get(authCookies.activeRole)?.value;
  const activeRole = isAppRole(selected) && roles.includes(selected) ? selected : roles[0] ?? null;
  return { user: data.user, roles, activeRole, refreshToken, demo: false };
}

export async function requirePortalAccess(allowed: readonly AppRole[], requestedPath: string) {
  const session = await getServerAuthSession();
  if (session.demo) return session;
  if (!session.user) {
    if (session.refreshToken) redirect(`/api/auth/refresh?next=${encodeURIComponent(requestedPath)}`);
    redirect(`/login?next=${encodeURIComponent(requestedPath)}&reason=authentication-required`);
  }
  if (!session.roles.some((role) => allowed.includes(role))) {
    const destination = session.activeRole ? roleHome[session.activeRole] : "/login";
    redirect(`${destination}?reason=role-required`);
  }
  return session;
}

export function resolvePostLoginPath(roles: AppRole[], requested: unknown, activeRole?: AppRole | null) {
  const safe = sanitizeNextPath(requested);
  if (safe) {
    const match = Object.entries({
      "/client": ["client", "owner", "super_admin"],
      "/barber": ["barber", "owner", "super_admin"],
      "/reception": ["receptionist", "manager", "owner", "super_admin"],
      "/admin": ["manager", "owner", "super_admin"],
    } as const).find(([root]) => safe === root || safe.startsWith(`${root}/`));
    if (!match || roles.some((role) => match[1].includes(role as never))) return safe;
  }
  const preferred = activeRole && roles.includes(activeRole) ? activeRole : roles[0] ?? "client";
  return roleHome[preferred];
}
