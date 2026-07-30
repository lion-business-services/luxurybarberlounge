import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { authCookies } from "@/lib/auth/config";
import { createPublicServerSupabase, createUntypedAdminSupabase, getServerAuthSession } from "@/lib/auth/server";
import { revokeAuthenticatedSession } from "@/lib/auth/session-audit";

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  const accessToken = request.cookies.get(authCookies.accessToken)?.value;
  const refreshToken = request.cookies.get(authCookies.refreshToken)?.value;
  const supabase = createPublicServerSupabase();

  if (supabase && accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  }

  await revokeAuthenticatedSession(accessToken);
  const admin = createUntypedAdminSupabase();
  if (admin && session.user) await admin.from("auth_audit").insert({ user_id: session.user.id, event_type: "logout", outcome: "success", metadata: { scope: "local" } });
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
