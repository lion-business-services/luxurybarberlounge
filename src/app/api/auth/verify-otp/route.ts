import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setAuthCookies } from "@/lib/auth/cookies";
import { isAppRole } from "@/lib/auth/config";
import { createPublicServerSupabase, ensureDefaultRole, resolvePostLoginPath } from "@/lib/auth/server";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

const schema = z.object({ email: z.string().trim().email().max(254), token: z.string().regex(/^\d{6}$/), next: z.string().optional() });

export async function POST(request: NextRequest) {
  const fingerprint = requestFingerprint(request.headers);
  const limit = rateLimit({ key: `otp-verify:${fingerprint}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) return NextResponse.json({ ok: false, message: "Too many attempts. Request a new code in a few minutes.", retryAfter: limit.retryAfterSeconds }, { status: 429 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Enter the six-digit code." }, { status: 400 }); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter the complete six-digit code." }, { status: 400 });
  const supabase = createPublicServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false, message: "Secure login is not activated yet.", code: "AUTH_NOT_CONFIGURED" }, { status: 503 });

  const { data, error } = await supabase.auth.verifyOtp({ email: parsed.data.email.toLowerCase(), token: parsed.data.token, type: "email" });
  if (error || !data.session || !data.user) return NextResponse.json({ ok: false, message: "That code is invalid or expired. Request a new code and try again." }, { status: 400 });
  const roles = await ensureDefaultRole(data.user);
  const activeRole = roles.find(isAppRole) ?? "client";
  const destination = resolvePostLoginPath(roles, parsed.data.next, activeRole);
  const response = NextResponse.json({ ok: true, destination, roles, activeRole });
  setAuthCookies(response, data.session, activeRole);
  return response;
}
