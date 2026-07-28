import { NextRequest, NextResponse } from "next/server";

const protectedRoots = ["/client", "/barber", "/reception", "/admin"] as const;

/**
 * Fail-closed portal gate for the credential-free release.
 *
 * Staff and client routes are available only when the explicit development
 * demo flag is enabled. Production authentication is intentionally activated
 * later with the documented Supabase SSR adapter, where both this edge gate
 * and database Row Level Security validate the authenticated user.
 *
 * Never infer authentication from an arbitrary cookie name. A browser can
 * create such a cookie itself, which would make the route gate decorative.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const root = protectedRoots.find((item) => pathname === item || pathname.startsWith(`${item}/`));
  if (!root) return NextResponse.next();

  const demoMode = process.env.NEXT_PUBLIC_PORTAL_DEMO_MODE === "true";
  if (demoMode) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  loginUrl.searchParams.set("reason", "authentication-required");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/client/:path*", "/barber/:path*", "/reception/:path*", "/admin/:path*"],
};
