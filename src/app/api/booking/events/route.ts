import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminSupabase } from "@/lib/auth/server";
import { businessConfig } from "@/lib/config/business";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";

const eventNames = [
  "booking_page_viewed",
  "qr_booking_page_viewed",
  "service_selected",
  "barber_selected",
  "first_available_selected",
  "date_selected",
  "time_selected",
  "booking_started",
  "booking_step_completed",
  "booking_abandoned",
  "booking_submitted",
  "booking_confirmed",
  "booking_failed",
  "availability_conflict",
  "call_action",
  "directions_action",
  "rebook_action",
] as const;

const schema = z.object({
  anonymousSessionId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  eventName: z.enum(eventNames),
  step: z.number().int().min(0).max(10).optional(),
  source: z.string().trim().max(80).optional(),
  campaignSource: z.string().trim().max(120).optional(),
  campaignMedium: z.string().trim().max(120).optional(),
  campaignName: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: NextRequest) {
  if (request.headers.get("dnt") === "1") return NextResponse.json({ ok: true, suppressed: true });
  const limited = rateLimit({ key: `booking-events:${requestFingerprint(request.headers)}`, limit: 90, windowMs: 60_000 });
  if (!limited.allowed) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });
  const admin = createUntypedAdminSupabase();
  if (!admin) return NextResponse.json({ ok: true, stored: false });
  const { data: business } = await admin.from("businesses").select("id").eq("slug", businessConfig.slug).maybeSingle();
  const { error } = await admin.from("booking_events").insert({
    business_id: business?.id ?? null,
    appointment_id: parsed.data.appointmentId ?? null,
    anonymous_session_id: parsed.data.anonymousSessionId,
    event_name: parsed.data.eventName,
    step: parsed.data.step ?? null,
    source: parsed.data.source ?? null,
    campaign_source: parsed.data.campaignSource ?? null,
    campaign_medium: parsed.data.campaignMedium ?? null,
    campaign_name: parsed.data.campaignName ?? null,
    metadata: parsed.data.metadata ?? {},
  });
  return NextResponse.json({ ok: !error, stored: !error }, { status: error ? 503 : 201 });
}
