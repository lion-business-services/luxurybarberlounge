import type { AppRole } from "@/lib/supabase/types";

export const authCookies = {
  accessToken: "lbl-access-token",
  refreshToken: "lbl-refresh-token",
  activeRole: "lbl-active-role",
} as const;

export const portalRoots: Record<string, readonly AppRole[]> = {
  "/client": ["client", "owner", "super_admin"],
  "/barber": ["barber", "owner", "super_admin"],
  "/reception": ["receptionist", "manager", "owner", "super_admin"],
  "/admin": ["manager", "owner", "super_admin"],
};

export const roleHome: Record<AppRole, string> = {
  client: "/client",
  barber: "/barber",
  receptionist: "/reception",
  manager: "/admin",
  owner: "/admin",
  super_admin: "/admin",
};

export function isAppRole(value: string | undefined | null): value is AppRole {
  return ["client", "barber", "receptionist", "manager", "owner", "super_admin"].includes(value ?? "");
}

export function sanitizeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value.slice(0, 500);
}

const rolePriority: Record<AppRole, number> = {
  client: 10,
  barber: 20,
  receptionist: 30,
  manager: 40,
  owner: 50,
  super_admin: 60,
};

export function selectPrimaryRole(roles: readonly AppRole[]): AppRole {
  return [...roles].sort((left, right) => rolePriority[right] - rolePriority[left])[0] ?? "client";
}
