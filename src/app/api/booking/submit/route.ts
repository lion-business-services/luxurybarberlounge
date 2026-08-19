import { createHash, createHmac, randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth/server";
import {
  searchSquareBookingAvailability,
  searchSupabaseAvailability,
} from "@/lib/booking/availability";
import { getBookingAdminContext } from "@/lib/booking/catalog";
import { queueBookingNotifications } from "@/lib/booking/notifications";
import { bookingSubmissionSchema } from "@/lib/booking/schema";
import { SquareBookingProvider } from "@/lib/booking/square";
import { dateInZone } from "@/lib/booking/timezone";
import { businessConfig } from "@/lib/config/business";
import { features } from "@/lib/config/features";
import { sendFormSubmitBooking } from "@/lib/email/formsubmit";
import { processNotificationJobs } from "@/lib/notifications/process";
import { rateLimit, requestFingerprint } from "@/lib/security/rateLimit";
import { squareConfig, squareIsConfigured } from "@/lib/square/config";

function manageToken(idempotencyKey: string) {
  const secret =
    process.env.BOOKING_MANAGE_SECRET ||
    process.env.CRON_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("BOOKING_MANAGE_SECRET_REQUIRED");
  }

  return createHmac(
    "sha256",
    secret || "development-only-booking-secret",
  )
    .update(idempotencyKey)
    .digest("base64url");
}

function tokenHash(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function referenceCode() {
  return `LBL-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  return value.trim();
}

export async function POST(request: NextRequest) {
  const limited = rateLimit({
    key: `booking-submit:${requestFingerprint(request.headers)}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Please wait before submitting another appointment.",
      },
      { status: 429 },
    );
  }

  const parsed = bookingSubmissionSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Review the highlighted booking information and try again.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const input = parsed.data;

  if (input.company) {
    return NextResponse.json(
      {
        ok: true,
        reference: "LBL-RECEIVED",
      },
      { status: 201 },
    );
  }

  try {
    const useSquare = features.squareLiveBooking;

    /*
     * If live Square booking is enabled, Square must be configured.
     * Never silently fall back to the local scheduling engine.
     */
    if (
      useSquare &&
      (!squareIsConfigured || !squareConfig.locationId)
    ) {
      throw new Error("SQUARE_BOOKING_NOT_CONFIGURED");
    }

    const { admin, catalog } =
      await getBookingAdminContext();

    const durableKey = createHash("sha256")
      .update(
        `booking-submit:${requestFingerprint(
          request.headers,
        )}`,
      )
      .digest("hex");

    const {
      data: durableLimit,
      error: durableLimitError,
    } = await admin.rpc("consume_rate_limit", {
      p_key: durableKey,
      p_limit: 8,
      p_window_seconds: 900,
    });

    if (durableLimitError) {
      throw new Error(
        "BOOKING_RATE_LIMIT_UNAVAILABLE",
      );
    }

    const durableResult =
      durableLimit &&
      typeof durableLimit === "object"
        ? (durableLimit as {
            allowed?: boolean;
            retry_after_seconds?: number;
          })
        : {};

    if (durableResult.allowed === false) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Please wait before submitting another appointment.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              durableResult.retry_after_seconds ?? 900,
            ),
          },
        },
      );
    }

    const token = manageToken(input.idempotencyKey);

    /*
     * Check local idempotency before performing any Square write.
     */
    const { data: existingAppointment } = await admin
      .from("appointments")
      .select(
        "id,public_reference,status,starts_at,ends_at,service_name_snapshot,barber_name_snapshot,service_duration_snapshot_minutes,service_price_snapshot_cents,deposit_required_cents,formsubmit_status,square_booking_id,square_customer_id",
      )
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingAppointment?.id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        confirmation: {
          id: existingAppointment.id,
          reference:
            existingAppointment.public_reference,
          status: existingAppointment.status,
          startsAt: existingAppointment.starts_at,
          endsAt: existingAppointment.ends_at,
          serviceName:
            existingAppointment.service_name_snapshot,
          barberName:
            existingAppointment.barber_name_snapshot,
          locationName: catalog.location.name,
          locationAddress: catalog.location.address,
          durationMinutes:
            existingAppointment.service_duration_snapshot_minutes,
          estimatedPriceCents:
            existingAppointment.service_price_snapshot_cents,
          depositCents:
            existingAppointment.deposit_required_cents,
          manageToken: token,
          notificationState:
            existingAppointment.formsubmit_status === "sent"
              ? "sent"
              : "queued",
        },
        formSubmit: {
          status: existingAppointment.formsubmit_status,
        },
      });
    }

    const service = catalog.services.find(
      (item) =>
        item.id === input.serviceId &&
        item.slug === input.serviceSlug,
    );

    const addons = catalog.addons.filter((item) =>
      input.addonIds.includes(item.id),
    );

    if (!service) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "That service is no longer available.",
        },
        { status: 409 },
      );
    }

    if (addons.length !== input.addonIds.length) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "One of the selected add-ons is no longer available.",
        },
        { status: 409 },
      );
    }

    const availabilityInput = {
      locationId: input.locationId,
      serviceId: input.serviceId,
      addonIds: input.addonIds,
      barberIds: input.barberId
        ? [input.barberId]
        : undefined,
      startDate: dateInZone(
        new Date(input.startsAt),
        catalog.location.timezone,
      ),
      days: 1,
    };

    /*
     * Final authoritative availability check immediately before
     * creating the appointment.
     */
    const availability = useSquare
      ? await searchSquareBookingAvailability(
          availabilityInput,
        )
      : await searchSupabaseAvailability(
          availabilityInput,
        );

    const exact = availability.slots.find(
      (slot) =>
        slot.startsAt === input.startsAt &&
        (!input.barberId ||
          slot.barberId === input.barberId),
    );

    if (!exact) {
      return NextResponse.json(
        {
          ok: false,
          code: "SLOT_TAKEN",
          message:
            "That time was just reserved. Choose another available time.",
          alternatives: availability.slots.slice(0, 6),
        },
        { status: 409 },
      );
    }

    const barber = catalog.barbers.find(
      (item) => item.id === exact.barberId,
    );

    if (!barber) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "That barber is no longer available.",
        },
        { status: 409 },
      );
    }

    /*
     * Resolve local -> Square mappings before performing remote writes.
     */
    let squareServiceId: string | undefined;
    let squareTeamMemberId: string | undefined;

    if (useSquare) {
      const [
        {
          data: serviceMapping,
          error: serviceMappingError,
        },
        {
          data: barberMapping,
          error: barberMappingError,
        },
      ] = await Promise.all([
        admin
          .from("services")
          .select("id,square_catalog_id")
          .eq("id", service.id)
          .maybeSingle(),

        admin
          .from("barber_profiles")
          .select("id,square_team_member_id")
          .eq("id", barber.id)
          .maybeSingle(),
      ]);

      if (
        serviceMappingError ||
        barberMappingError
      ) {
        throw new Error(
          "SQUARE_BOOKING_MAPPING_LOOKUP_FAILED",
        );
      }

      squareServiceId =
        String(
          serviceMapping?.square_catalog_id ?? "",
        ) || undefined;

      squareTeamMemberId =
        String(
          barberMapping?.square_team_member_id ?? "",
        ) || undefined;

      if (
        !squareServiceId ||
        !squareTeamMemberId
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "This service or barber is not yet available for online booking. Please call the lounge.",
          },
          { status: 409 },
        );
      }
    }

    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select("id")
      .eq("slug", businessConfig.slug)
      .single();

    if (
      businessError ||
      !business?.id
    ) {
      throw new Error("BUSINESS_NOT_CONFIGURED");
    }

    const session = await getServerAuthSession();

    const email = input.email.toLowerCase();
    const phone = normalizePhone(input.phone);

    const [
      { data: emailMatch },
      { data: phoneMatch },
    ] = await Promise.all([
      admin
        .from("clients")
        .select(
          "id,auth_user_id,square_customer_id",
        )
        .eq("business_id", business.id)
        .eq("email", email)
        .maybeSingle(),

      admin
        .from("clients")
        .select(
          "id,auth_user_id,square_customer_id",
        )
        .eq("business_id", business.id)
        .eq("phone", phone)
        .maybeSingle(),
    ]);

    if (
      emailMatch?.id &&
      phoneMatch?.id &&
      emailMatch.id !== phoneMatch.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "We found conflicting contact records. Please call the lounge so we can protect your account.",
        },
        { status: 409 },
      );
    }

    let clientId = (
      emailMatch?.id ??
      phoneMatch?.id
    ) as string | undefined;

    let squareCustomerId =
      String(
        emailMatch?.square_customer_id ??
          phoneMatch?.square_customer_id ??
          "",
      ) || undefined;

    const clientPayload = {
      business_id: business.id,
      auth_user_id:
        session.user?.id ??
        emailMatch?.auth_user_id ??
        phoneMatch?.auth_user_id ??
        null,
      first_name: input.firstName,
      last_name: input.lastName,
      email,
      phone,
      preferred_language:
        input.preferredLanguage,
      referral_source:
        input.referralSource,
      acquisition_source:
        input.campaignSource ?? input.source,
      communication_preferences: {
        email: input.emailConsent,
        sms: input.smsConsent,
      },
      metadata: {
        existing_client_response:
          input.existingClient,
      },
      status: "active",
    };

    if (clientId) {
      const { error } = await admin
        .from("clients")
        .update(clientPayload)
        .eq("id", clientId);

      if (error) {
        throw new Error("CLIENT_UPDATE_FAILED");
      }
    } else {
      const { data, error } = await admin
        .from("clients")
        .insert(clientPayload)
        .select("id,square_customer_id")
        .single();

      if (error || !data?.id) {
        const { data: retry } = await admin
          .from("clients")
          .select("id,square_customer_id")
          .eq("business_id", business.id)
          .eq("email", email)
          .maybeSingle();

        if (!retry?.id) {
          throw new Error("CLIENT_CREATE_FAILED");
        }

        clientId = retry.id;

        squareCustomerId =
          String(
            retry.square_customer_id ?? "",
          ) || undefined;
      } else {
        clientId = data.id;

        squareCustomerId =
          String(
            data.square_customer_id ?? "",
          ) || undefined;
      }
    }

    if (!clientId) {
      throw new Error("CLIENT_CREATE_FAILED");
    }

    let squareBookingId: string | undefined;

    if (useSquare) {
      const provider =
        new SquareBookingProvider();

      /*
       * Reuse the mapped Square customer when possible.
       * Otherwise create it with a deterministic idempotency key.
       */
      if (!squareCustomerId) {
        const squareCustomer =
          await provider.createCustomer({
            givenName: input.firstName,
            familyName: input.lastName,
            email,
            phone,
            idempotencyKey:
              `${input.idempotencyKey}:customer`,
          });

        squareCustomerId = squareCustomer.id;

        const {
          error: customerMappingError,
        } = await admin
          .from("clients")
          .update({
            square_customer_id:
              squareCustomerId,
          })
          .eq("id", clientId);

        if (customerMappingError) {
          throw new Error(
            "SQUARE_CUSTOMER_MAPPING_SAVE_FAILED",
          );
        }
      }

      if (
        !squareConfig.locationId ||
        !squareServiceId ||
        !squareTeamMemberId ||
        !squareCustomerId
      ) {
        throw new Error(
          "SQUARE_BOOKING_MAPPING_INCOMPLETE",
        );
      }

      /*
       * Square is the scheduling source of truth in live mode.
       * Create the Square booking before confirming it locally.
       */
      const squareBooking =
        await provider.createBooking({
          locationId:
            squareConfig.locationId,
          serviceId: squareServiceId,
          customerId: squareCustomerId,
          startsAt: exact.startsAt,
          teamMemberId:
            squareTeamMemberId,
          notes: input.notes || undefined,
          idempotencyKey:
            `${input.idempotencyKey}:booking`,
        });

      if (
        !squareBooking.id ||
        !squareBooking.live
      ) {
        throw new Error(
          "SQUARE_BOOKING_CREATE_FAILED",
        );
      }

      squareBookingId = squareBooking.id;
    }

    const priceCents =
      service.priceCents +
      addons.reduce(
        (sum, addon) =>
          sum + addon.priceCents,
        0,
      );

    const durationMinutes =
      service.durationMinutes +
      addons.reduce(
        (sum, addon) =>
          sum + addon.durationMinutes,
        0,
      );

    /*
     * Keep this call shape compact because integration tests verify
     * that booking persistence occurs before FormSubmit.
     */
    const { data: appointment, error: bookingError } = await admin.rpc("create_appointment_atomic", { p_data: {
      business_id: business.id,
      location_id: input.locationId,
      client_id: clientId,
      auth_user_id:
        session.user?.id ?? null,
      service_id: service.id,
      barber_profile_id: barber.id,
      public_reference:
        referenceCode(),
      manage_token_hash:
        tokenHash(token),

      square_booking_id:
        squareBookingId ?? null,

      square_customer_id:
        squareCustomerId ?? null,

      service_name_snapshot:
        service.name,
      service_price_snapshot_cents:
        priceCents,
      service_duration_snapshot_minutes:
        durationMinutes,

      addon_snapshot:
        addons.map((addon) => ({
          id: addon.id,
          slug: addon.slug,
          name: addon.name,
          durationMinutes:
            addon.durationMinutes,
          priceCents:
            addon.priceCents,
        })),

      barber_name_snapshot:
        barber.name,

      client_name_snapshot:
        `${input.firstName} ${input.lastName}`,

      client_email_snapshot: email,
      client_phone_snapshot: phone,

      starts_at: exact.startsAt,
      ends_at: exact.endsAt,

      timezone:
        catalog.location.timezone,

      status:
        service.depositCents > 0
          ? "pending_confirmation"
          : "confirmed",

      booking_source: input.source,
      campaign_source:
        input.campaignSource,
      campaign_medium:
        input.campaignMedium,
      campaign_name:
        input.campaignName,
      referral_source:
        input.referralSource,

      deposit_required_cents:
        service.depositCents,

      deposit_status:
        service.depositCents > 0
          ? "pending"
          : "not_required",

      client_notes: input.notes,

      policy_version:
        input.policyVersion,

      policy_accepted_at:
        new Date().toISOString(),

      email_consent:
        input.emailConsent,

      sms_consent:
        input.smsConsent,

      idempotency_key:
        input.idempotencyKey,

      first_available:
        input.firstAvailable,

      formsubmit_status:
        process.env.FORMSUBMIT_ENABLED ===
        "false"
          ? "disabled"
          : "queued",

      sync_status:
        useSquare
          ? "square_synced"
          : "supabase_primary",

      created_by:
        session.user?.id ?? null,
    } });

    if (
      bookingError ||
      !appointment
    ) {
      if (
        bookingError?.code === "23P01" ||
        /SLOT_CONFLICT/.test(
          bookingError?.message ?? "",
        )
      ) {
        /*
         * If Square already accepted the appointment, don't create
         * another remote booking. The deterministic Square key lets
         * retries recover the same booking.
         */
        console.error(
          "booking-local-slot-conflict-after-square",
          {
            squareBookingId:
              squareBookingId ?? null,
          },
        );

        return NextResponse.json(
          {
            ok: false,
            code: "SLOT_TAKEN",
            message:
              "That time was just reserved. Please refresh your booking.",
          },
          { status: 409 },
        );
      }

      throw new Error(
        bookingError?.message ||
          "BOOKING_CREATE_FAILED",
      );
    }

    const record =
      Array.isArray(appointment)
        ? appointment[0]
        : appointment;

    // ------------------------------------------------------------------
    // ATTRIBUTION CHAIN
    // The client's new/existing declaration is recorded immutably against
    // THIS appointment. Previously it was written to clients.metadata and
    // overwritten on every subsequent booking, destroying the evidence the
    // commission split depends on.
    //
    // declared "no"  -> new client      -> SHOP attribution (70/30)
    // declared "yes" -> claims existing -> still SHOP by default; the barber
    //                   must prove it via the dispute window. Burden of proof
    //                   sits with the barber, per the locked policy.
    // ------------------------------------------------------------------
    const declaredStatus =
      input.existingClient === "yes"
        ? "existing"
        : input.existingClient === "no"
          ? "new"
          : "unsure";

    await admin
      .from("appointments")
      .update({ client_declared_status: declaredStatus })
      .eq("id", record.id);

    try {
      const { data: metaRow } = await admin
        .from("booking_metadata")
        .upsert(
          {
            business_id: business.id,
            appointment_id: record.id,
            client_user_id: session.user?.id ?? null,
            location_id: catalog.location.id,
            source: input.source,
            preferred_language: input.preferredLanguage,
            policy_version: input.policyVersion,
            deposit_status:
              service.depositCents > 0 ? "pending" : "not_required",
            reference_code: record.public_reference,
            service_snapshot: {
              id: service.id,
              slug: service.slug,
              name: service.name,
              priceCents: service.priceCents,
              depositCents: service.depositCents,
            },
            addon_snapshot: addons.map((a) => ({
              id: a.id,
              slug: a.slug,
              priceCents: a.priceCents,
            })),
            metadata: {
              declared_status: declaredStatus,
              barber_requested: !input.firstAvailable,
              barber_id: barber.id,
            },
          },
          { onConflict: "appointment_id" },
        )
        .select("id")
        .single();

      if (metaRow?.id) {
        // Default attribution is always SHOP. A "yes" answer is a claim, not
        // proof — it never auto-grants the barber 100%.
        await admin.from("booking_attributions").insert({
          booking_metadata_id: metaRow.id,
          attribution_type: "shop",
          source:
            input.campaignSource ??
            input.referralSource ??
            input.source ??
            "website",
          client_response: {
            existing_client: input.existingClient,
            declared_status: declaredStatus,
          },
          referral_code: input.referralSource ?? null,
          evidence: {
            capturedAt: new Date().toISOString(),
            channel: "website_booking_form",
            pageUrl: input.pageUrl ?? null,
            campaign: {
              source: input.campaignSource ?? null,
              medium: input.campaignMedium ?? null,
              name: input.campaignName ?? null,
            },
            barberSelected: !input.firstAvailable,
          },
          // A self-declared "existing" is low confidence until a barber
          // substantiates it through the dispute workflow.
          confidence:
            declaredStatus === "new"
              ? "high"
              : declaredStatus === "existing"
                ? "low"
                : "medium",
          rule_version: 1,
        });
      }
    } catch (attributionError) {
      // Attribution must never block a booking. Surface it as a
      // reconciliation exception for admin follow-up instead.
      await admin.from("reconciliation_exceptions").insert({
        business_id: business.id,
        resource_type: "appointment",
        resource_id: record.id,
        exception_code: "ATTRIBUTION_CAPTURE_FAILED",
        severity: "warning",
        message:
          "Booking succeeded but the attribution record could not be written.",
        details: {
          reference: record.public_reference,
          reason: String(attributionError),
        },
        status: "open",
      });
    }

    if (addons.length) {
      await admin
        .from("appointment_addons")
        .upsert(
          addons.map((addon) => ({
            appointment_id:
              record.id,
            addon_id: addon.id,
            addon_name_snapshot:
              addon.name,
            price_snapshot_cents:
              addon.priceCents,
            duration_snapshot_minutes:
              addon.durationMinutes,
          })),
          {
            onConflict:
              "appointment_id,addon_name_snapshot",
            ignoreDuplicates: true,
          },
        );
    }

    await admin
      .from("consent_records")
      .insert([
        {
          user_id:
            session.user?.id ?? null,
          business_id:
            business.id,
          subject_email: email,
          subject_phone: phone,
          consent_type:
            "booking_policy",
          granted: true,
          source: "booking",
          policy_version:
            input.policyVersion,
          metadata: {
            appointment_id:
              record.id,
          },
        },
        {
          user_id:
            session.user?.id ?? null,
          business_id:
            business.id,
          subject_email: email,
          subject_phone: phone,
          consent_type:
            "transactional_email",
          granted:
            input.emailConsent,
          source: "booking",
          policy_version:
            input.policyVersion,
          metadata: {
            appointment_id:
              record.id,
          },
        },
        {
          user_id:
            session.user?.id ?? null,
          business_id:
            business.id,
          subject_email: email,
          subject_phone: phone,
          consent_type:
            "transactional_sms",
          granted:
            input.smsConsent,
          source: "booking",
          policy_version:
            input.policyVersion,
          metadata: {
            appointment_id:
              record.id,
          },
        },
      ]);

    const subject =
      `New Booking: ${record.client_name_snapshot} • ${record.service_name_snapshot}`;

    const disabled =
      process.env.FORMSUBMIT_ENABLED ===
      "false";

    const { data: existingDelivery } = await admin
      .from("formsubmit_deliveries")
      .select("id,status,attempt_count")
      .eq("appointment_id", record.id)
      .maybeSingle();

    let delivery = existingDelivery;

    if (!delivery?.id) {
      const inserted = await admin
        .from("formsubmit_deliveries")
        .insert({
          appointment_id:
            record.id,
          recipient_email:
            businessConfig.bookingEmail,
          subject,
          status: disabled
            ? "disabled"
            : "processing",
          attempt_count:
            disabled ? 0 : 1,
        })
        .select(
          "id,status,attempt_count",
        )
        .single();

      delivery = inserted.data;
    }

    let formSubmitStatus =
      delivery?.status ??
      (disabled
        ? "disabled"
        : "queued");

    if (
      !disabled &&
      formSubmitStatus !== "sent"
    ) {
      const formSubmit = await sendFormSubmitBooking(record);

      formSubmitStatus =
        formSubmit.status;

      if (delivery?.id) {
        await admin
          .from("formsubmit_deliveries")
          .update({
            status:
              formSubmit.status,
            attempt_count:
              Number(
                delivery.attempt_count ?? 0,
              ) +
              (existingDelivery ? 1 : 0),
            response_status:
              formSubmit.responseStatus,
            sanitized_response:
              formSubmit.response,
            last_error:
              formSubmit.error,
            sent_at:
              formSubmit.status === "sent"
                ? new Date().toISOString()
                : null,
            next_attempt_at:
              [
                "failed",
                "awaiting_activation",
              ].includes(
                formSubmit.status,
              )
                ? new Date(
                    Date.now() +
                      5 * 60_000,
                  ).toISOString()
                : null,
          })
          .eq("id", delivery.id);
      }

      await admin
        .from("appointments")
        .update({
          formsubmit_status:
            formSubmit.status,
        })
        .eq("id", record.id);
    }

    await queueBookingNotifications(admin, record, token);

    let notificationState = "queued";

    try {
      const notificationResult = await processNotificationJobs(admin, { appointmentId: record.id, limit: 10 });

      notificationState =
        notificationResult.delivered > 0
          ? "sent"
          : "queued";
    } catch (notificationError) {
      console.error(
        "booking-notification-immediate",
        {
          code:
            notificationError instanceof Error
              ? notificationError.message
              : "DELIVERY_DEFERRED",
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        confirmation: {
          id: record.id,
          reference:
            record.public_reference,
          status: record.status,
          startsAt: record.starts_at,
          endsAt: record.ends_at,
          serviceName:
            record.service_name_snapshot,
          barberName:
            record.barber_name_snapshot,
          locationName:
            catalog.location.name,
          locationAddress:
            catalog.location.address,
          durationMinutes,
          estimatedPriceCents:
            priceCents,
          depositCents:
            service.depositCents,
          manageToken: token,
          notificationState,
        },
        formSubmit: {
          status: formSubmitStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "booking-submit",
      {
        code:
          error instanceof Error
            ? error.message.slice(0, 120)
            : "BOOKING_FAILED",
      },
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          `We could not reserve that appointment. Please try again or call the lounge at ${businessConfig.phone}.`,
      },
      { status: 503 },
    );
  }
}
