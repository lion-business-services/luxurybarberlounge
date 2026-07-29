import "server-only";
import type { Session } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { authCookies } from "./config";
import type { AppRole } from "@/lib/supabase/types";

const secure = process.env.NODE_ENV === "production";
const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/", priority: "high" as const };

export function setAuthCookies(response: NextResponse, session: Session, activeRole: AppRole) {
  response.cookies.set(authCookies.accessToken, session.access_token, { ...base, maxAge: Math.max(60, session.expires_in ?? 3600) });
  response.cookies.set(authCookies.refreshToken, session.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set(authCookies.activeRole, activeRole, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of Object.values(authCookies)) response.cookies.set(name, "", { ...base, maxAge: 0 });
}
