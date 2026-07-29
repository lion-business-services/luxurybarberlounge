import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicServerSupabase } from "@/lib/auth/server";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

const schema = z.object({ email: z.string().trim().email().max(254), next: z.string().optional() });
const generic = "If the address can receive access codes, a six-digit code is on its way.";

export async function POST(request: NextRequest) {
  const fingerprint = requestFingerprint(request.headers);
  const limit = rateLimit({ key: `otp-request:${fingerprint}`, limit: 5, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) return NextResponse.json({ ok: false, message: "Please wait before requesting another code.", retryAfter: limit.retryAfterSeconds }, { status: 429 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 }); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  const supabase = createPublicServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false, message: "Secure login is not activated yet. Contact the lounge for assistance.", code: "AUTH_NOT_CONFIGURED" }, { status: 503 });

  await supabase.auth.signInWithOtp({
    email: parsed.data.email.toLowerCase(),
    options: { shouldCreateUser: true, data: { requested_portal_access: true } },
  });
  return NextResponse.json({ ok: true, message: generic, retryAfter: 60 });
}
