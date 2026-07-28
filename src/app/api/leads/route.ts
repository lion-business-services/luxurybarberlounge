import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`lead:${ip}`, 8, 60_000).allowed) {
    return NextResponse.json({ message: "Please wait before submitting another request." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ reference: `LBL-${randomUUID().slice(0, 8).toUpperCase()}`, accepted: true }, { status: 201 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  if (name.length < 2 || !emailPattern.test(email) || phone.length < 7) {
    return NextResponse.json({ message: "Please provide a valid name, email, and phone number." }, { status: 422 });
  }

  const reference = `LBL-${randomUUID().slice(0, 8).toUpperCase()}`;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({
      reference,
      accepted: false,
      live: false,
      message: "Online delivery is not active. Please call or email the lounge to complete your request.",
    }, { status: 202 });
  }

  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const { error } = await admin.from("leads").insert({
    business_id: business?.id ?? null,
    source: typeof body.source === "string" ? body.source.slice(0, 80) : "website",
    status: "new",
    full_name: name,
    email,
    phone,
    preferred_language: body.language === "es" ? "es" : "en",
    service_interest: typeof body.service === "string" ? body.service.slice(0, 120) : null,
    payload: { ...body, company: undefined, reference },
    consent: {
      sms: body.smsConsent === true,
      marketing: body.marketingConsent === true,
      policy: body.policyConsent === true,
    },
  });

  if (error) {
    return NextResponse.json({ message: "The request could not be saved. Please call the lounge." }, { status: 503 });
  }
  return NextResponse.json({ reference, accepted: true, live: true }, { status: 201 });
}
