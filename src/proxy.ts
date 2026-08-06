import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authCookies } from "@/lib/auth/config";

const protectedRoots = ["/client", "/barber", "/reception", "/admin"] as const;
const secure = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
  priority: "high" as const,
};

function loginRedirect(request: NextRequest, reason: string) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  loginUrl.searchParams.set("reason", reason);
  const response = NextResponse.redirect(loginUrl);
  for (const name of Object.values(authCookies)) {
    response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
  return response;
}

/**
 * Refreshes the secure Supabase session before a protected server component
 * renders. This keeps navigation between public pages and portals from making a
 * valid user appear signed out when the short-lived access token expires.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const root = protectedRoots.find((item) => pathname === item || pathname.startsWith(`${item}/`));
  if (!root || process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE === "true") return NextResponse.next();

  const accessToken = request.cookies.get(authCookies.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookies.refreshToken)?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!refreshToken && !accessToken) return loginRedirect(request, "authentication-required");
  if (!url || !anonKey) return loginRedirect(request, "authentication-unavailable");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    if (data.user) return NextResponse.next();
  }

  if (!refreshToken) return loginRedirect(request, "session-expired");
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) return loginRedirect(request, "session-expired");

  const response = NextResponse.next();
  response.cookies.set(authCookies.accessToken, data.session.access_token, {
    ...cookieOptions,
    maxAge: Math.max(60, data.session.expires_in ?? 3600),
  });
  response.cookies.set(authCookies.refreshToken, data.session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export const config = {
  matcher: ["/client/:path*", "/barber/:path*", "/reception/:path*", "/admin/:path*"],
};
