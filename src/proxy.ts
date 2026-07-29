import { NextRequest, NextResponse } from "next/server";
import { authCookies } from "@/lib/auth/config";

const protectedRoots = ["/client", "/barber", "/reception", "/admin"] as const;

/**
 * Fast optimistic gate only. Each portal root also performs server-side user and
 * role validation in its layout, while database RLS remains the final boundary.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const root = protectedRoots.find((item) => pathname === item || pathname.startsWith(`${item}/`));
  if (!root || process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE === "true") return NextResponse.next();

  const hasAccess = Boolean(request.cookies.get(authCookies.accessToken)?.value);
  const hasRefresh = Boolean(request.cookies.get(authCookies.refreshToken)?.value);
  if (hasAccess || hasRefresh) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  loginUrl.searchParams.set("reason", "authentication-required");
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/client/:path*", "/barber/:path*", "/reception/:path*", "/admin/:path*"] };
