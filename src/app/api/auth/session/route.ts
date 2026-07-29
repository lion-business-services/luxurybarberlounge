import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";

export async function GET() {
  const session = await getServerAuthSession();
  return NextResponse.json({
    authenticated: Boolean(session.user) || Boolean(session.demo),
    email: session.user?.email ?? null,
    roles: session.roles,
    activeRole: session.activeRole,
    demo: Boolean(session.demo),
  });
}
