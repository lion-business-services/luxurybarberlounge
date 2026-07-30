import { NextRequest, NextResponse } from "next/server";
import { authCookies } from "@/lib/auth/config";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { createPublicServerSupabase, createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { revokeAllAuthenticatedSessions } from "@/lib/auth/session-audit";

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const accessToken = request.cookies.get(authCookies.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookies.refreshToken)?.value;
  const supabase = createPublicServerSupabase();
  if (supabase && accessToken && refreshToken) {
    const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (!result.error) await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
  }
  await revokeAllAuthenticatedSessions(session.user?.id);
  const admin = createUntypedAdminSupabase();
  if (admin && session.user) await admin.from("auth_audit").insert({ user_id: session.user.id, event_type: "logout_all_devices", outcome: "success", metadata: {} });
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
