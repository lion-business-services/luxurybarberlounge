import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { features } from "@/lib/config/features";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  if (!features.walkInQueue) {
    return NextResponse.json({ message: "Digital walk-in check-in is not active. Please call or visit the lounge." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`queue:${ip}`, 6, 60_000).allowed) {
    return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ token: "PENDING", live: false }, { status: 201 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  const service = typeof body.service === "string" ? body.service.slice(0, 120) : "";
  if (name.length < 2 || phone.length < 7 || !service) {
    return NextResponse.json({ message: "Name, phone, and service are required." }, { status: 422 });
  }

  const token = randomBytes(4).toString("hex").toUpperCase();
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({
      token,
      live: false,
      estimatedWait: null,
      message: "Preview only. Your place was not added to a live queue.",
    }, { status: 202 });
  }

  const { data: business } = await admin.from("businesses").select("id").eq("slug", "luxury-barber-lounge").maybeSingle();
  const { data: location } = business?.id
    ? await admin.from("locations").select("id").eq("business_id", business.id).eq("slug", "northfield").maybeSingle()
    : { data: null };
  if (!business?.id || !location?.id) {
    return NextResponse.json({ message: "Queue configuration is incomplete. Please speak with reception." }, { status: 503 });
  }

  const estimatedWait = 25;
  const { error } = await admin.from("queue_entries").insert({
    business_id: business.id,
    location_id: location.id,
    public_token: token,
    status: "waiting",
    service_slug: service,
    barber_preference: typeof body.barber === "string" ? body.barber.slice(0, 120) : "first-available",
    client_name: name,
    client_phone: phone,
    estimated_wait_minutes: estimatedWait,
    metadata: {
      returning: typeof body.returning === "string" || typeof body.returning === "boolean" ? body.returning : null,
      smsConsent: body.smsConsent === "yes" || body.smsConsent === true,
      estimate: true,
    },
  });
  if (error) {
    return NextResponse.json({ message: "Queue service is temporarily unavailable. Please speak with reception." }, { status: 503 });
  }
  return NextResponse.json({ token, estimatedWait, live: true, estimate: true }, { status: 201 });
}
