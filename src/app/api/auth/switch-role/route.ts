import { NextRequest, NextResponse } from "next/server";
import { authCookies, isAppRole, roleHome } from "@/lib/auth/config";
import { getServerAuthSession } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session.user) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { role?: string } | null;
  if (!isAppRole(body?.role) || !session.roles.includes(body.role)) return NextResponse.json({ ok: false }, { status: 403 });
  const response = NextResponse.json({ ok: true, destination: roleHome[body.role] });
  response.cookies.set(authCookies.activeRole, body.role, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
