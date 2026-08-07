import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth/server";
import {
  dateInZone,
  weekdayForDate,
  zonedParts,
} from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";
import { features } from "@/lib/config/features";
import {
  activeQueueStatuses,
  assignNextQueueEntry,
  createPublicDisplayLabel,
  getQueueContext,
  recalculateQueueWaits,
} from "@/lib/queue/operations";
import { checkRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(40).optional(),
  service: z.string().trim().min(1).max(120),
  barber: z.string().trim().max(120).optional(),
  returning: z.union([z.string(), z.boolean()]).optional(),
  smsConsent: z
    .union([z.literal("yes"), z.literal("no"), z.boolean()])
    .optional(),
  publicDisplayConsent: z
    .union([z.literal("yes"), z.literal("no"), z.boolean()])
    .optional(),
  company: z.string().optional(),
});

function clockMinutes(value: string | null | undefined) {
  if (!value) return null;

  const [hour, minute] = value.slice(0, 5).split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

export async function POST(request: NextRequest) {
  /*
   * Public feature gate.
   */
  if (!features.walkInQueue) {
    return NextResponse.json(
      {
        message:
          "Digital walk-in check-in is not active. Please call or visit the lounge.",
        code: "WALK_IN_QUEUE_DISABLED",
      },
      { status: 503 },
    );
  }

  /*
   * Basic request throttling.
   */
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (!checkRateLimit(`queue:${ip}`, 6, 60_000).allowed) {
    return NextResponse.json(
      {
        message: "Please wait before trying again.",
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  /*
   * Validate the submitted payload.
   */
  const parsed = schema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Name, phone, and service are required.",
        code: "INVALID_QUEUE_REQUEST",
      },
      { status: 422 },
    );
  }

  /*
   * Honeypot. Bots filling the hidden company field receive a harmless
   * response without creating a real queue entry.
   */
  if (parsed.data.company?.trim()) {
    return NextResponse.json(
      {
        token: "PENDING",
        live: false,
      },
      { status: 201 },
    );
  }

  /*
   * Resolve the canonical Luxury Barber Lounge / Northfield context.
   */
  const context = await getQueueContext();

  if (!context) {
    return NextResponse.json(
      {
        message:
          "Queue configuration is unavailable. Please call the lounge.",
        code: "QUEUE_CONFIGURATION_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  /*
   * ------------------------------------------------------------
   * SHOP-OPEN / WALK-IN AVAILABILITY GUARD
   * ------------------------------------------------------------
   *
   * Never accept a new digital walk-in merely because the web page
   * itself is reachable.
   *
   * The source of truth is:
   *
   * 1. Holiday hours for today's local date, when present.
   * 2. Otherwise the normal weekday business-hours record.
   * 3. Location-level walk-in enable/disable configuration.
   *
   * All time calculations are performed in America/New_York through
   * businessConfig.timezone.
   */

  const now = new Date();
  const localDate = dateInZone(now, businessConfig.timezone);
  const weekday = weekdayForDate(localDate);

  const [
    holidayResult,
    regularHoursResult,
    locationSettingsResult,
  ] = await Promise.all([
    context.admin
      .from("holiday_hours")
      .select("opens_at,closes_at,closed")
      .eq("location_id", context.locationId)
      .eq("service_date", localDate)
      .maybeSingle(),

    context.admin
      .from("business_hours")
      .select("opens_at,closes_at,closed")
      .eq("location_id", context.locationId)
      .eq("weekday", weekday)
      .maybeSingle(),

    context.admin
      .from("location_settings")
      .select("walk_ins_enabled,max_queue_size")
      .eq("location_id", context.locationId)
      .maybeSingle(),
  ]);

  /*
   * Fail closed if operating hours cannot be verified.
   *
   * A public queue should never guess whether the store is open.
   */
  if (
    holidayResult.error ||
    regularHoursResult.error ||
    locationSettingsResult.error
  ) {
    console.error("queue-hours-lookup-failed", {
      holiday: holidayResult.error?.message ?? null,
      regularHours: regularHoursResult.error?.message ?? null,
      locationSettings: locationSettingsResult.error?.message ?? null,
    });

    return NextResponse.json(
      {
        message:
          "Live queue availability could not be verified. Please call or visit the lounge.",
        code: "QUEUE_AVAILABILITY_UNVERIFIED",
      },
      { status: 503 },
    );
  }

  /*
   * An admin/operator can explicitly pause digital walk-ins without
   * disabling the rest of the website.
   */
  if (locationSettingsResult.data?.walk_ins_enabled === false) {
    return NextResponse.json(
      {
        message:
          "Digital walk-in check-in is currently paused. Please speak with reception.",
        code: "WALK_INS_PAUSED",
      },
      { status: 409 },
    );
  }

  /*
   * Holiday hours override the recurring weekly schedule.
   */
  const activeHours =
    holidayResult.data ?? regularHoursResult.data;

  const opensAt = clockMinutes(activeHours?.opens_at);
  const closesAt = clockMinutes(activeHours?.closes_at);

  const localNow = zonedParts(
    now,
    businessConfig.timezone,
  );

  const currentMinutes =
    localNow.hour * 60 + localNow.minute;

  const shopIsOpen =
    Boolean(activeHours) &&
    activeHours?.closed !== true &&
    opensAt !== null &&
    closesAt !== null &&
    currentMinutes >= opensAt &&
    currentMinutes < closesAt;

  if (!shopIsOpen) {
    return NextResponse.json(
      {
        message:
          "The walk-in queue is currently closed. Please join during open business hours.",
        code: "SHOP_CLOSED",
        localDate,
        timezone: businessConfig.timezone,
      },
      { status: 409 },
    );
  }

  /*
   * Resolve the authenticated client when this request came from the
   * client portal. Public walk-ins remain supported.
   */
  const session = await getServerAuthSession();

  const clientUserId =
    session.user && session.roles.includes("client")
      ? session.user.id
      : null;

  const { data: profile } = clientUserId
    ? await context.admin
        .from("profiles")
        .select("full_name,display_name,phone")
        .eq("id", clientUserId)
        .maybeSingle()
    : { data: null };

  const name =
    parsed.data.name ||
    profile?.display_name ||
    profile?.full_name ||
    "";

  const phone =
    parsed.data.phone ||
    profile?.phone ||
    "";

  if (
    name.trim().length < 2 ||
    phone.trim().length < 7
  ) {
    return NextResponse.json(
      {
        message:
          "Confirm your name and phone before joining the queue.",
        code: "CLIENT_DETAILS_REQUIRED",
      },
      { status: 422 },
    );
  }

  /*
   * Resolve a real active/bookable service.
   */
  const { data: service, error: serviceError } =
    await context.admin
      .from("services")
      .select("id,slug,duration_minutes")
      .eq("business_id", context.businessId)
      .eq("slug", parsed.data.service)
      .eq("active", true)
      .eq("bookable", true)
      .maybeSingle();

  if (serviceError) {
    console.error(
      "queue-service-lookup-failed",
      serviceError,
    );

    return NextResponse.json(
      {
        message:
          "Queue service information is temporarily unavailable.",
        code: "SERVICE_LOOKUP_FAILED",
      },
      { status: 503 },
    );
  }

  if (!service?.id) {
    return NextResponse.json(
      {
        message:
          "Choose an available service before joining the queue.",
        code: "INVALID_QUEUE_SERVICE",
      },
      { status: 422 },
    );
  }

  /*
   * Prevent a client from joining the active queue more than once.
   */
  const duplicateQuery = context.admin
    .from("queue_entries")
    .select(
      "id,public_token,status,estimated_wait_minutes",
    )
    .eq("location_id", context.locationId)
    .in("status", [...activeQueueStatuses]);

  const { data: existing, error: duplicateError } =
    clientUserId
      ? await duplicateQuery
          .eq("client_id", clientUserId)
          .limit(1)
          .maybeSingle()
      : await duplicateQuery
          .eq("client_phone", phone.trim())
          .limit(1)
          .maybeSingle();

  if (duplicateError) {
    console.error(
      "queue-duplicate-check-failed",
      duplicateError,
    );

    return NextResponse.json(
      {
        message:
          "Queue availability could not be verified. Please try again.",
        code: "QUEUE_DUPLICATE_CHECK_FAILED",
      },
      { status: 503 },
    );
  }

  if (existing?.id) {
    return NextResponse.json({
      token: existing.public_token,
      estimatedWait:
        existing.estimated_wait_minutes,
      live: true,
      duplicate: true,
      status: existing.status,
    });
  }

  /*
   * ------------------------------------------------------------
   * QUEUE CAPACITY GUARD
   * ------------------------------------------------------------
   *
   * The owner-configured max_queue_size is enforced server-side.
   * A client cannot bypass this by calling the API directly.
   */

  const maxQueueSize =
    typeof locationSettingsResult.data?.max_queue_size ===
      "number" &&
    locationSettingsResult.data.max_queue_size > 0
      ? locationSettingsResult.data.max_queue_size
      : 30;

  const {
    count: activeQueueCount,
    error: queueCountError,
  } = await context.admin
    .from("queue_entries")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("location_id", context.locationId)
    .in("status", [...activeQueueStatuses]);

  if (queueCountError) {
    console.error(
      "queue-capacity-check-failed",
      queueCountError,
    );

    return NextResponse.json(
      {
        message:
          "Queue capacity could not be verified. Please speak with reception.",
        code: "QUEUE_CAPACITY_UNVERIFIED",
      },
      { status: 503 },
    );
  }

  if (
    typeof activeQueueCount === "number" &&
    activeQueueCount >= maxQueueSize
  ) {
    return NextResponse.json(
      {
        message:
          "The walk-in queue is currently at capacity. Please call the lounge or try again shortly.",
        code: "QUEUE_AT_CAPACITY",
      },
      { status: 409 },
    );
  }

  /*
   * Create the queue identity.
   */
  const token = randomBytes(4)
    .toString("hex")
    .toUpperCase();

  const displayConsent =
    parsed.data.publicDisplayConsent === "yes" ||
    parsed.data.publicDisplayConsent === true;

  const publicDisplayLabel = displayConsent
    ? createPublicDisplayLabel(name)
    : null;

  /*
   * Persist the queue entry.
   */
  const {
    data: inserted,
    error: insertError,
  } = await context.admin
    .from("queue_entries")
    .insert({
      business_id: context.businessId,
      location_id: context.locationId,
      client_id: clientUserId,
      public_token: token,
      status: "waiting",
      service_id: service.id,
      service_slug: service.slug,
      barber_preference:
        parsed.data.barber || "first-available",
      client_name: name.trim(),
      client_phone: phone.trim(),
      estimated_wait_minutes: null,
      public_display_consent: displayConsent,
      public_display_label: publicDisplayLabel,
      metadata: {
        returning:
          parsed.data.returning ?? null,
        smsConsent:
          parsed.data.smsConsent === "yes" ||
          parsed.data.smsConsent === true,
        source: clientUserId
          ? "client_portal"
          : "public_walk_in",
        joinedLocalDate: localDate,
        joinedTimezone:
          businessConfig.timezone,
      },
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    console.error(
      "queue-entry-insert-failed",
      insertError,
    );

    return NextResponse.json(
      {
        message:
          "Queue service is temporarily unavailable. Please speak with reception.",
        code: "QUEUE_INSERT_FAILED",
      },
      { status: 503 },
    );
  }

  /*
   * History and audit are intentionally separate from the primary queue
   * insert. The actual queue position is not discarded if a secondary
   * audit write has a transient failure.
   */
  const [
    historyResult,
    auditResult,
  ] = await Promise.all([
    context.admin
      .from("queue_status_history")
      .insert({
        queue_entry_id: inserted.id,
        to_status: "waiting",
        changed_by: clientUserId,
        note: "Digital queue check-in",
      }),

    context.admin
      .from("audit_logs")
      .insert({
        business_id: context.businessId,
        actor_user_id: clientUserId,
        actor_role: clientUserId
          ? "client"
          : null,
        action: "queue_joined",
        resource_type: "queue_entry",
        resource_id: inserted.id,
        metadata: {
          source: clientUserId
            ? "client_portal"
            : "public_walk_in",
          public_display_consent:
            displayConsent,
        },
      }),
  ]);

  if (historyResult.error) {
    console.error(
      "queue-history-insert-failed",
      historyResult.error,
    );
  }

  if (auditResult.error) {
    console.error(
      "queue-audit-insert-failed",
      auditResult.error,
    );
  }

  /*
   * Recalculate queue ETAs, then invoke deterministic Who's Next.
   *
   * Assignment failure must not destroy an already valid walk-in.
   */
  let refreshed;

  try {
    refreshed =
      await recalculateQueueWaits(context);
  } catch (error) {
    console.error(
      "queue-wait-recalculation-failed",
      error,
    );

    return NextResponse.json(
      {
        token,
        estimatedWait: null,
        live: true,
        estimate: false,
        warning:
          "You are in the queue, but the wait estimate is temporarily unavailable.",
      },
      { status: 201 },
    );
  }

  await assignNextQueueEntry(
    context,
    clientUserId,
  ).catch((error) => {
    console.error(
      "queue-auto-assignment-failed",
      error,
    );
  });

  /*
   * Recalculate once more after automatic assignment because assignment
   * can change the workload and therefore the estimate displayed to the
   * newly joined guest and the TV queue.
   */
  let finalQueue = refreshed;

  try {
    finalQueue =
      await recalculateQueueWaits(context);
  } catch (error) {
    console.error(
      "queue-post-assignment-recalculation-failed",
      error,
    );
  }

  const row = finalQueue.entries.find(
    (entry) => entry.id === inserted.id,
  );

  return NextResponse.json(
    {
      token,
      estimatedWait:
        row?.estimatedWaitMinutes ?? null,
      live: true,
      estimate: true,
      status: row?.status ?? "waiting",
      assignedBarber:
        row?.assignedBarberName ?? null,
    },
    { status: 201 },
  );
}