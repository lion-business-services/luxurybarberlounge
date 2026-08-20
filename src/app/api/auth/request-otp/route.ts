import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicServerSupabase } from "@/lib/auth/server";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

const schema = z.object({ email: z.string().trim().email().max(254), next: z.string().optional() });
const generic = "If the address can receive access codes, a six-digit code is on its way.";

export async function POST(request: NextRequest) {
  const fingerprint = requestFingerprint(request.headers);

  // IMPORTANT: the shop's barbers all sign in from the same wifi, so they share
  // one IP. A per-IP limit of 5 locked out everyone after the fifth barber.
  // The meaningful limit is per email address; the IP limit exists only to stop
  // bulk abuse and is set well above real staff usage.
  const ipLimit = rateLimit({ key: `otp-ip:${fingerprint}`, limit: 60, windowMs: 15 * 60 * 1000 });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many sign-in attempts from this network. Please try again shortly.", retryAfter: ipLimit.retryAfterSeconds },
      { status: 429 },
    );
  }

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 }); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 });
  const emailKey = parsed.data.email.trim().toLowerCase();
  const emailLimit = rateLimit({ key: `otp-email:${emailKey}`, limit: 8, windowMs: 15 * 60 * 1000 });
  if (!emailLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "OTP_RATE_LIMITED",
        retryAfter: emailLimit.retryAfterSeconds,
        message: `A code was already sent to this address. Please check your inbox, or try again in ${emailLimit.retryAfterSeconds} seconds.`,
      },
      { status: 429 },
    );
  }

  const supabase = createPublicServerSupabase();
  if (!supabase) return NextResponse.json({ ok: false, message: "Secure login is not activated yet. Contact the lounge for assistance.", code: "AUTH_NOT_CONFIGURED" }, { status: 503 });

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email.toLowerCase(),
    options: { shouldCreateUser: true, data: { requested_portal_access: true } },
  });
  if (error) {
    // Supabase throttles OTP sends per address. That is NOT a delivery failure -
    // reporting it as one made a working login look broken. Surface the real
    // reason and the exact wait, so the person knows to simply wait a moment.
    const status = (error as { status?: number }).status;
    const code = (error as { code?: string }).code ?? "";
    const raw = error.message ?? "";
    const isThrottled =
      status === 429 ||
      code === "over_email_send_rate_limit" ||
      /only request this after/i.test(raw);

    if (isThrottled) {
      const seconds = Number(raw.match(/after (\d+) seconds?/i)?.[1] ?? 30);
      return NextResponse.json(
        {
          ok: false,
          code: "OTP_RATE_LIMITED",
          retryAfter: seconds,
          message: `A code was just sent. Please check your inbox, or request another in ${seconds} second${seconds === 1 ? "" : "s"}.`,
        },
        { status: 429, headers: { "retry-after": String(seconds) } },
      );
    }

    return NextResponse.json(
      { ok: false, message: "Secure email delivery is temporarily unavailable. Please try again shortly.", code: "OTP_DELIVERY_FAILED" },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, message: generic, retryAfter: 60 });
}
