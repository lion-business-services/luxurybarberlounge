import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { POST as createQueueEntry } from "@/app/api/queue/route";
import { dateInZone, zonedDateTimeToUtc } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";
import { getQueueContext } from "@/lib/queue/operations";

const enrichedQueueSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(254),
  service: z.string().trim().min(1).max(120),
  barber: z.string().trim().max(120).optional(),
  returning: z.union([z.string(), z.boolean()]).optional(),
  walkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  walkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  smsConsent: z
    .union([z.literal("yes"), z.literal("no"), z.boolean()])
    .optional(),
  publicDisplayConsent: z
    .union([z.literal("yes"), z.literal("no"), z.boolean()])
    .optional(),
  company: z.string().optional(),
});

type BaseQueueResponse = {
  token?: string;
  estimatedWait?: number | null;
  message?: string;
  live?: boolean;
  duplicate?: boolean;
  status?: string;
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = enrichedQueueSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          "Name, phone, email, service, walk-in date, and walk-in time are required.",
        code: "INVALID_WALK_IN_DETAILS",
      },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const today = dateInZone(new Date(), businessConfig.timezone);

  if (input.walkInDate !== today) {
    return NextResponse.json(
      {
        message: "Walk-in entries must use today's lounge date.",
        code: "INVALID_WALK_IN_DATE",
      },
      { status: 422 },
    );
  }

  const context = await getQueueContext();

  if (!context) {
    return NextResponse.json(
      {
        message: "Queue configuration is unavailable. Please speak with reception.",
        code: "QUEUE_CONFIGURATION_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const walkInAt = zonedDateTimeToUtc(
    input.walkInDate,
    `${input.walkInTime}:00`,
    businessConfig.timezone,
  );

  const forwardedHeaders = new Headers();
  forwardedHeaders.set("content-type", "application/json");

  for (const name of [
    "cookie",
    "authorization",
    "user-agent",
    "x-forwarded-for",
    "x-real-ip",
  ]) {
    const value = request.headers.get(name);
    if (value) forwardedHeaders.set(name, value);
  }

  const baseRequest = new NextRequest(
    new URL("/api/queue", request.url),
    {
      method: "POST",
      headers: forwardedHeaders,
      body: JSON.stringify(raw),
    },
  );

  const baseResponse = await createQueueEntry(baseRequest);
  const basePayload = (await baseResponse.json().catch(() => ({}))) as BaseQueueResponse;

  if (!baseResponse.ok || !basePayload.token || basePayload.live !== true) {
    return NextResponse.json(basePayload, { status: baseResponse.status });
  }

  const { data: entry, error: entryError } = await context.admin
    .from("queue_entries")
    .select("id,service_id,service_slug,metadata")
    .eq("location_id", context.locationId)
    .eq("public_token", basePayload.token)
    .maybeSingle();

  if (entryError || !entry?.id || !entry.service_id) {
    console.error("walk-in-enrichment-entry-lookup-failed", entryError);
    return NextResponse.json(
      {
        message: "The walk-in was added, but its details could not be finalized. Please speak with reception.",
        code: "WALK_IN_ENRICHMENT_LOOKUP_FAILED",
      },
      { status: 503 },
    );
  }

  const { data: service, error: serviceError } = await context.admin
    .from("services")
    .select("id,price_cents,starting_price")
    .eq("business_id", context.businessId)
    .eq("id", entry.service_id)
    .maybeSingle();

  if (
    serviceError ||
    !service?.id ||
    typeof service.price_cents !== "number" ||
    service.price_cents < 0
  ) {
    console.error("walk-in-enrichment-service-price-failed", serviceError);
    return NextResponse.json(
      {
        message: "The service total could not be verified. Please speak with reception.",
        code: "WALK_IN_SERVICE_PRICE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const priorMetadata =
    entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : {};

  const { error: updateError } = await context.admin
    .from("queue_entries")
    .update({
      client_email: input.email.toLowerCase(),
      service_price_snapshot_cents: service.price_cents,
      walk_in_at: walkInAt.toISOString(),
      joined_at: walkInAt.toISOString(),
      metadata: {
        ...priorMetadata,
        walkInLocalDate: input.walkInDate,
        walkInLocalTime: input.walkInTime,
        walkInTimezone: businessConfig.timezone,
        serviceTotalCents: service.price_cents,
        serviceStartingPrice: service.starting_price === true,
      },
    })
    .eq("id", entry.id);

  if (updateError) {
    console.error("walk-in-enrichment-update-failed", updateError);
    return NextResponse.json(
      {
        message: "The walk-in was added, but its details could not be finalized. Please speak with reception.",
        code: "WALK_IN_ENRICHMENT_UPDATE_FAILED",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      ...basePayload,
      clientEmail: input.email.toLowerCase(),
      walkInAt: walkInAt.toISOString(),
      serviceTotalCents: service.price_cents,
      serviceStartingPrice: service.starting_price === true,
    },
    { status: baseResponse.status },
  );
}