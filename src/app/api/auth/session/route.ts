import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { authCookies, isAppRole, roleHome, selectPrimaryRole } from "@/lib/auth/config";
import {
  createPublicServerSupabase,
  ensureDefaultRole,
  getRolesForUser,
  getServerAuthSession,
} from "@/lib/auth/server";

function jsonSession(input: {
  authenticated: boolean;
  email: string | null;
  roles: string[];
  activeRole: string | null;
  demo: boolean;
}) {
  const portalUrl = input.activeRole && isAppRole(input.activeRole)
    ? roleHome[input.activeRole]
    : null;
  return {
    ...input,
    portalUrl,
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (session.user || session.demo) {
    const response = NextResponse.json(jsonSession({
      authenticated: true,
      email: session.user?.email ?? null,
      roles: session.roles,
      activeRole: session.activeRole,
      demo: Boolean(session.demo),
    }));
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }

  // Keep a verified user signed in across the public website. Access tokens are
  // intentionally short-lived, so the session endpoint renews them from the
  // secure refresh cookie instead of making the public header look signed out.
  const refreshToken = session.refreshToken ?? request.cookies.get(authCookies.refreshToken)?.value;
  const supabase = createPublicServerSupabase();
  if (refreshToken && supabase) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session && data.user) {
      const assignedRoles = await getRolesForUser(data.user.id);
      const roles = assignedRoles.length ? assignedRoles : await ensureDefaultRole(data.user);
      const selected = request.cookies.get(authCookies.activeRole)?.value;
      const activeRole = isAppRole(selected) && roles.includes(selected)
        ? selected
        : selectPrimaryRole(roles);
      const response = NextResponse.json(jsonSession({
        authenticated: true,
        email: data.user.email ?? null,
        roles,
        activeRole,
        demo: false,
      }));
      setAuthCookies(response, data.session, activeRole);
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      return response;
    }
  }

  const response = NextResponse.json(jsonSession({
    authenticated: false,
    email: null,
    roles: [],
    activeRole: null,
    demo: false,
  }));
  if (refreshToken) clearAuthCookies(response);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
