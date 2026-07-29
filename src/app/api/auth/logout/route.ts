import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { authCookies } from "@/lib/auth/config";
import { createPublicServerSupabase } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
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

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
