import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getServerAuthSession();
  const response = NextResponse.json({
    authenticated: Boolean(session.user) || Boolean(session.demo),
    email: session.user?.email ?? null,
    roles: session.roles,
    activeRole: session.activeRole,
    demo: Boolean(session.demo),
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
