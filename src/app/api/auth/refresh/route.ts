import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { authCookies, isAppRole, sanitizeNextPath } from "@/lib/auth/config";
import { createPublicServerSupabase, getRolesForUser } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  const next = sanitizeNextPath(request.nextUrl.searchParams.get("next")) ?? "/client";
  const refreshToken = request.cookies.get(authCookies.refreshToken)?.value;
  const supabase = createPublicServerSupabase();
  if (!refreshToken || !supabase) {
    const response = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, request.url));
    clearAuthCookies(response);
    return response;
  }
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    const response = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}&reason=session-expired`, request.url));
    clearAuthCookies(response);
    return response;
  }
  const roles = await getRolesForUser(data.user.id);
  const selected = request.cookies.get(authCookies.activeRole)?.value;
  const activeRole = isAppRole(selected) && roles.includes(selected) ? selected : roles[0] ?? "client";
  const response = NextResponse.redirect(new URL(next, request.url));
  setAuthCookies(response, data.session, activeRole);
  return response;
}
