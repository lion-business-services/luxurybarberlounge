import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import {
  squareRequest,
  SquareConfigurationError,
} from "@/lib/square/client";
import { squareConfig } from "@/lib/square/config";

type AnyRecord = Record<string, unknown>;

type WebhookEventRow = {
  id: string;
  business_id: string | null;
  event_type: string;
  payload: unknown;
  attempt_count: number;
};

type CatalogObject = {
  type?: string;
  id?: string;
  version?: number;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_variation_data?: {
    item_id?: string;
    name?: string;
    pricing_type?: string;
    price_money?: {
      amount?: number;
      currency?: string;
    };
    location_overrides?: Array<{
      location_id?: string;
      pricing_type?: string;
      price_money?: {
        amount?: number;
        currency?: string;
      };
    }>;
    service_duration?: number;
    available_for_booking?: boolean;
    team_member_ids?: string[];
  };
};

type BatchRetrieveCatalogResponse = {
  objects?: CatalogObject[];
  related_objects?: CatalogObject[];
  errors?: unknown[];
};

function record(value: unknown): AnyRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function integer(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? Math.round(value)
    : 0;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function money(value: unknown) {
  return integer(record(value).amount);
}

function moneyOrNull(value: unknown) {
  const amount = finiteNumber(record(value).amount);

  return amount === null
    ? null
    : Math.round(amount);
}

function bookingDisplayTime(value: unknown) {
  if (typeof value !== "string") {
    return "the scheduled time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "the scheduled time";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function nestedObject(payload: unknown) {
  const data = record(record(payload).data);
  const object = record(data.object);

  return object;
}

function webhookData(payload: unknown) {
  return record(record(payload).data);
}

async function canonical<T>(
  path: string,
  fallback: T,
): Promise<T> {
  try {
    return await squareRequest<T>(path);
  } catch (error) {
    if (error instanceof SquareConfigurationError) {
      return fallback;
    }

    throw error;
  }
}

async function businessId(event: WebhookEventRow) {
  if (event.business_id) {
    return event.business_id;
  }

  const admin = createUntypedAdminSupabase();

  if (!admin) {
    return null;
  }

  const { data } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", "luxury-barber-lounge")
    .maybeSingle();

  return typeof data?.id === "string"
    ? data.id
    : null;
}

async function syncBooking(
  event: WebhookEventRow,
  raw: AnyRecord,
) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);

  if (!admin || !id || !business) {
    throw new Error(
      "Booking event is missing its business or Square ID.",
    );
  }

  const response = await canonical<{
    booking?: AnyRecord;
  }>(
    `/v2/bookings/${encodeURIComponent(id)}`,
    { booking: raw },
  );

  const booking = record(response.booking ?? raw);

  const segments = Array.isArray(
    booking.appointment_segments,
  )
    ? booking.appointment_segments.map(record)
    : [];

  const duration = segments.reduce(
    (sum, item) =>
      sum + integer(item.duration_minutes),
    0,
  );

  const team = text(
    segments[0]?.team_member_id,
  );

  const { error } = await admin
    .from("square_bookings")
    .upsert(
      {
        business_id: business,
        square_id: id,
        square_customer_id: text(
          booking.customer_id,
        ),
        square_team_member_id: team,
        status: text(booking.status),
        starts_at: text(booking.start_at),
        duration_minutes:
          duration || null,
        version:
          integer(booking.version) || null,
        raw: booking,
        synced_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "business_id,square_id",
      },
    );

  if (error) {
    throw error;
  }

  const customerId = text(
    booking.customer_id,
  );

  if (customerId) {
    let recipient: string | null = null;

    const {
      data: localCustomer,
    } = await admin
      .from("square_customers")
      .select("email")
      .eq("business_id", business)
      .eq("square_id", customerId)
      .maybeSingle();

    recipient = text(
      localCustomer?.email,
    );

    if (!recipient) {
      try {
        const customerResponse =
          await canonical<{
            customer?: AnyRecord;
          }>(
            `/v2/customers/${encodeURIComponent(
              customerId,
            )}`,
            {},
          );

        recipient = text(
          record(
            customerResponse.customer,
          ).email_address,
        );
      } catch {
        recipient = null;
      }
    }

    if (recipient) {
      const created =
        event.event_type ===
        "booking.created";

      const when =
        bookingDisplayTime(
          booking.start_at,
        );

      const status =
        text(booking.status)
          ?.replaceAll("_", " ")
          .toLowerCase() ||
        "scheduled";

      await admin
        .from("notification_jobs")
        .upsert(
          {
            business_id: business,
            user_id: null,
            channel: "email",
            template_key: created
              ? "booking_confirmation"
              : "booking_update",
            recipient,
            payload: {
              subject: created
                ? "Your Luxury Barber Lounge appointment"
                : "Your appointment was updated",
              body: created
                ? `Your Luxury Barber Lounge appointment is scheduled for ${when}. We look forward to welcoming you. Call 609-338-1876 if you need assistance.`
                : `Your Luxury Barber Lounge appointment for ${when} is now ${status}. Call 609-338-1876 if you need assistance.`,
              transactional: true,
              squareBookingId: id,
              eventType:
                event.event_type,
              startsAt:
                booking.start_at ??
                null,
              status:
                booking.status ?? null,
            },
            scheduled_for:
              new Date().toISOString(),
            status: "queued",
            idempotency_key:
              `square:${event.id}:booking-notification`,
          },
          {
            onConflict:
              "channel,idempotency_key",
            ignoreDuplicates: true,
          },
        );
    }
  }

  return {
    resource: "booking",
    squareId: id,
  };
}

async function syncPayment(
  event: WebhookEventRow,
  raw: AnyRecord,
) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);

  if (!admin || !id || !business) {
    throw new Error(
      "Payment event is missing its business or Square ID.",
    );
  }

  const response = await canonical<{
    payment?: AnyRecord;
  }>(
    `/v2/payments/${encodeURIComponent(id)}`,
    { payment: raw },
  );

  const payment = record(
    response.payment ?? raw,
  );

  const card = record(
    record(payment.card_details).card,
  );

  const processing = Array.isArray(
    payment.processing_fee,
  )
    ? payment.processing_fee
        .map(record)
        .reduce(
          (sum, fee) =>
            sum +
            money(fee.amount_money),
          0,
        )
    : 0;

  const { error } = await admin
    .from("square_payments")
    .upsert(
      {
        business_id: business,
        square_id: id,
        square_order_id: text(
          payment.order_id,
        ),
        square_customer_id: text(
          payment.customer_id,
        ),
        status: text(payment.status),
        amount_cents: money(
          payment.amount_money,
        ),
        tip_cents: money(
          payment.tip_money,
        ),
        processing_fee_cents:
          processing,
        card_brand: text(
          card.card_brand,
        ),
        created_at_square: text(
          payment.created_at,
        ),
        raw: payment,
        synced_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "business_id,square_id",
      },
    );

  if (error) {
    throw error;
  }

  const orderId = text(payment.order_id);
  const paymentStatus = text(payment.status);
  if (orderId) {
    const { data: checkoutLink } = await admin
      .from("appointment_payment_links")
      .select("id,appointment_id,purpose,status")
      .eq("business_id", business)
      .eq("square_order_id", orderId)
      .maybeSingle();
    if (checkoutLink?.id && paymentStatus === "COMPLETED") {
      await admin.from("appointment_payment_links").update({ status: "paid", paid_at: text(payment.updated_at) ?? text(payment.created_at) ?? new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", checkoutLink.id);
      // Membership first-month payments have no appointment link; handled below.
      if (checkoutLink.purpose === "deposit") {
        await admin.from("appointments").update({ deposit_status: "paid" }).eq("id", checkoutLink.appointment_id).neq("deposit_status", "refunded");
        // Deposit settled -> promote the held booking to confirmed.
        // Scoped to pending_confirmation so cancelled/completed rows are never resurrected.
        const { data: promoted } = await admin
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", checkoutLink.appointment_id)
          .eq("status", "pending_confirmation")
          .select("*")
          .maybeSingle();

        // Confirmation email/SMS were withheld at booking time because the
        // deposit was outstanding. Now that it has settled, send them.
        if (promoted) {
          try {
            const [{ queueBookingNotifications }, { randomBytes, createHash }] =
              await Promise.all([
                import("@/lib/booking/notifications"),
                import("node:crypto"),
              ]);
            // Single-purpose token for the "Pay balance now" email link. Stored
            // in its own column so it never invalidates the manage token the
            // client is already holding in their browser.
            const balanceToken = randomBytes(32).toString("hex");
            await admin
              .from("appointments")
              .update({ balance_token_hash: createHash("sha256").update(balanceToken).digest("hex") })
              .eq("id", promoted.id);
            // NEVER rotate manage_token_hash here. The client is holding the
            // original token in their browser URL; rotating it 404s the page
            // they are actively looking at. Only the hash is stored, so the
            // raw token cannot be recovered - the email falls back to the
            // client portal link instead.
            await queueBookingNotifications(
              admin,
              { ...promoted, deposit_status: "paid", balance_token: balanceToken },
              "",
            );
            // Send now instead of waiting for the 5-minute notification cron.
            try {
              const { processNotificationJobs } = await import("@/lib/notifications/process");
              await processNotificationJobs(admin, { appointmentId: promoted.id, limit: 10 });
            } catch {
              // Cron will retry.
            }
          } catch {
            // Never let notification delivery fail the payment webhook.
          }
        }
      }
    } else if (checkoutLink?.id && ["CANCELED", "FAILED"].includes(paymentStatus ?? "")) {
      await admin.from("appointment_payment_links").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", checkoutLink.id).neq("status", "paid");
      if (checkoutLink.purpose === "deposit") await admin.from("appointments").update({ deposit_status: "failed" }).eq("id", checkoutLink.appointment_id).neq("deposit_status", "paid");
    }
    // Membership enrolment: a paid first month with no appointment link.
    if (status === "COMPLETED" || status === "APPROVED") {
      await activateMembershipIfPaid(admin, raw);
    }
  }

  return {
    resource: "payment",
    squareId: id,
  };
}

async function syncRefund(
  event: WebhookEventRow,
  raw: AnyRecord,
) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);

  if (!admin || !id || !business) {
    throw new Error(
      "Refund event is missing its business or Square ID.",
    );
  }

  const response = await canonical<{
    refund?: AnyRecord;
  }>(
    `/v2/refunds/${encodeURIComponent(id)}`,
    { refund: raw },
  );

  const refund = record(
    response.refund ?? raw,
  );

  const { error } = await admin
    .from("square_refunds")
    .upsert(
      {
        business_id: business,
        square_id: id,
        square_payment_id:
          text(refund.payment_id) ??
          "unknown",
        status: text(refund.status),
        amount_cents: money(
          refund.amount_money,
        ),
        reason: text(refund.reason),
        raw: refund,
        synced_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "business_id,square_id",
      },
    );

  if (error) {
    throw error;
  }

  return {
    resource: "refund",
    squareId: id,
  };
}

async function syncOrder(
  event: WebhookEventRow,
  raw: AnyRecord,
) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);

  if (!admin || !id || !business) {
    throw new Error(
      "Order event is missing its business or Square ID.",
    );
  }

  const response = await canonical<{
    order?: AnyRecord;
  }>(
    `/v2/orders/${encodeURIComponent(id)}`,
    { order: raw },
  );

  const order = record(
    response.order ?? raw,
  );

  const { error } = await admin
    .from("square_orders")
    .upsert(
      {
        business_id: business,
        square_id: id,
        location_square_id: text(
          order.location_id,
        ),
        customer_square_id: text(
          order.customer_id,
        ),
        state: text(order.state),
        total_cents: money(
          order.total_money,
        ),
        tax_cents: money(
          order.total_tax_money,
        ),
        discount_cents: money(
          order.total_discount_money,
        ),
        // Square reports the 4% fee under total_service_charge_money. Captured
        // separately so it can be excluded from the commission basis.
        service_charge_cents: money(
          order.total_service_charge_money,
        ),
        raw: order,
        synced_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "business_id,square_id",
      },
    );

  if (error) {
    throw error;
  }

  return {
    resource: "order",
    squareId: id,
  };
}

async function syncCustomer(
  event: WebhookEventRow,
  raw: AnyRecord,
) {
  const admin = createUntypedAdminSupabase();
  const id = text(raw.id);
  const business = await businessId(event);

  if (!admin || !id || !business) {
    throw new Error(
      "Customer event is missing its business or Square ID.",
    );
  }

  /*
   * A deleted customer is included in the webhook
   * payload. Do not try to retrieve it from Square
   * after deletion because the canonical resource
   * may no longer be retrievable.
   */
  const deleted =
    event.event_type ===
      "customer.deleted" ||
    webhookData(event.payload)
      .deleted === true;

  let customer = raw;

  if (!deleted) {
    const response = await canonical<{
      customer?: AnyRecord;
    }>(
      `/v2/customers/${encodeURIComponent(id)}`,
      { customer: raw },
    );

    customer = record(
      response.customer ?? raw,
    );
  }

  const displayName =
    [
      text(customer.given_name),
      text(customer.family_name),
    ]
      .filter(Boolean)
      .join(" ") ||
    text(customer.company_name);

  const rawSnapshot = deleted
    ? {
        ...customer,
        deleted: true,
      }
    : customer;

  const { error } = await admin
    .from("square_customers")
    .upsert(
      {
        business_id: business,
        square_id: id,
        email: text(
          customer.email_address,
        ),
        phone: text(
          customer.phone_number,
        ),
        display_name:
          displayName || null,
        raw: rawSnapshot,
        synced_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "business_id,square_id",
      },
    );

  if (error) {
    throw error;
  }

  return {
    resource: "customer",
    squareId: id,
    deleted,
  };
}

function variationLocationState(
  variation: AnyRecord,
) {
  const locationId =
    process.env.SQUARE_LOCATION_ID
      ?.trim() || null;

  const overrides =
    Array.isArray(
      variation.location_overrides,
    )
      ? variation.location_overrides.map(
          record,
        )
      : [];

  const override = locationId
    ? overrides.find(
        (item) =>
          text(item.location_id) ===
          locationId,
      )
    : undefined;

  const pricingType =
    text(override?.pricing_type) ??
    text(variation.pricing_type);

  const overridePrice =
    override
      ? moneyOrNull(
          override.price_money,
        )
      : null;

  const globalPrice =
    moneyOrNull(
      variation.price_money,
    );

  /*
   * A location-specific price wins over the global
   * price when Square has one configured.
   */
  const priceCents =
    overridePrice ??
    globalPrice;

  return {
    pricingType,
    priceCents,
  };
}

function catalogObjectIsPresentAtLocation(
  object: CatalogObject,
) {
  const locationId =
    process.env.SQUARE_LOCATION_ID
      ?.trim() || null;

  if (!locationId) {
    return true;
  }

  if (
    object.present_at_all_locations ===
    true
  ) {
    return !(
      object.absent_at_location_ids ??
      []
    ).includes(locationId);
  }

  const present =
    object.present_at_location_ids;

  if (
    Array.isArray(present) &&
    present.length > 0
  ) {
    return present.includes(locationId);
  }

  /*
   * If Square does not provide explicit location
   * presence fields, avoid disabling the service
   * based on an assumption.
   */
  return true;
}

async function retrieveMappedCatalogObjects(
  objectIds: string[],
) {
  const objects: CatalogObject[] = [];

  /*
   * Square permits up to 1,000 object IDs in one
   * BatchRetrieveCatalogObjects request.
   */
  for (
    let index = 0;
    index < objectIds.length;
    index += 1000
  ) {
    const batch = objectIds.slice(
      index,
      index + 1000,
    );

    const response =
      await squareRequest<BatchRetrieveCatalogResponse>(
        "/v2/catalog/batch-retrieve",
        {
          method: "POST",
          body: {
            object_ids: batch,
            include_related_objects:
              false,
            include_deleted_objects:
              true,
          },
        },
      );

    objects.push(
      ...(response.objects ?? []),
    );
  }

  return objects;
}

async function syncCatalog(
  event: WebhookEventRow,
) {
  const admin =
    createUntypedAdminSupabase();

  const business =
    await businessId(event);

  if (!admin || !business) {
    throw new Error(
      "Catalog event is missing its business context.",
    );
  }

  /*
   * Only synchronize services that have deliberately
   * been mapped to a Square Catalog object.
   *
   * This prevents similarly named Square products or
   * unrelated catalog records from modifying the
   * website.
   */
  const {
    data: mappedServices,
    error: mappedError,
  } = await admin
    .from("services")
    .select(
      "id,slug,name,square_catalog_id,price_cents,duration_minutes,bookable,active",
    )
    .eq("business_id", business)
    .not(
      "square_catalog_id",
      "is",
      null,
    );

  if (mappedError) {
    throw mappedError;
  }

  const services = (
    mappedServices ?? []
  ).map(record);

  const objectIds = Array.from(
    new Set(
      services
        .map((service) =>
          text(
            service.square_catalog_id,
          ),
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    ),
  );

  /*
   * This is valid during setup. The webhook can exist
   * before the service mappings are populated.
   */
  if (objectIds.length === 0) {
    return {
      resource: "catalog",
      synced: 0,
      disabled: 0,
      mapped: 0,
      reason:
        "No local services are mapped to Square catalog variations yet.",
    };
  }

  const objects =
    await retrieveMappedCatalogObjects(
      objectIds,
    );

  const byId = new Map(
    objects
      .filter(
        (object) =>
          typeof object.id ===
          "string",
      )
      .map((object) => [
        object.id as string,
        object,
      ]),
  );

  let synced = 0;
  let disabled = 0;

  /*
   * Validate every local mapping before applying price
   * changes. An invalid mapping should become visible
   * as a webhook-processing failure rather than silently
   * leaving an old price online.
   */
  for (const service of services) {
    const serviceId = text(service.id);
    const serviceName =
      text(service.name) ??
      text(service.slug) ??
      "Unknown service";

    const squareId = text(
      service.square_catalog_id,
    );

    if (!serviceId || !squareId) {
      continue;
    }

    const object =
      byId.get(squareId);

    if (!object) {
      throw new Error(
        `Mapped Square catalog object ${squareId} for ${serviceName} was not returned by Square.`,
      );
    }

    /*
     * Booking services must map to an ITEM_VARIATION.
     * The Bookings API requires service_variation_id,
     * not the parent ITEM ID.
     */
    if (
      object.type !==
      "ITEM_VARIATION"
    ) {
      throw new Error(
        `Square mapping ${squareId} for ${serviceName} is ${object.type ?? "an unknown type"}; expected ITEM_VARIATION.`,
      );
    }

    /*
     * If a Square service was deleted or explicitly
     * removed from the configured lounge location,
     * fail closed for new bookings.
     */
    if (
      object.is_deleted === true ||
      !catalogObjectIsPresentAtLocation(
        object,
      )
    ) {
      const { error } = await admin
        .from("services")
        .update({
          bookable: false,
        })
        .eq("business_id", business)
        .eq("id", serviceId);

      if (error) {
        throw error;
      }

      disabled += 1;
      continue;
    }

    const variation = record(
      object.item_variation_data,
    );

    const {
      pricingType,
      priceCents,
    } =
      variationLocationState(
        variation,
      );

    /*
     * The website requires a deterministic price.
     * Never replace a known website price with a
     * missing or variable Square price.
     */
    if (
      pricingType !==
        "FIXED_PRICING" ||
      priceCents === null
    ) {
      const { error } = await admin
        .from("services")
        .update({
          bookable: false,
        })
        .eq("business_id", business)
        .eq("id", serviceId);

      if (error) {
        throw error;
      }

      disabled += 1;
      continue;
    }

    const durationMs =
      finiteNumber(
        variation.service_duration,
      );

    const durationMinutes =
      durationMs !== null &&
      durationMs > 0
        ? Math.max(
            1,
            Math.round(
              durationMs / 60_000,
            ),
          )
        : null;

    const update: AnyRecord = {
      price_cents: priceCents,
    };

    if (
      durationMinutes !== null
    ) {
      update.duration_minutes =
        durationMinutes;
    }

    /*
     * Square's booking flag is authoritative only when
     * it is explicitly present.
     */
    if (
      typeof variation.available_for_booking ===
      "boolean"
    ) {
      update.bookable =
        variation.available_for_booking;
    }

    const { error } = await admin
      .from("services")
      .update(update)
      .eq("business_id", business)
      .eq("id", serviceId);

    if (error) {
      throw error;
    }

    synced += 1;
  }

  return {
    resource: "catalog",
    mapped: objectIds.length,
    synced,
    disabled,
  };
}

async function syncTeamMember(
  event: WebhookEventRow,
  raw: AnyRecord,
) {
  const admin =
    createUntypedAdminSupabase();

  const business =
    await businessId(event);

  const eventData =
    webhookData(event.payload);

  const id =
    text(raw.id) ??
    text(eventData.id);

  if (!admin || !business || !id) {
    throw new Error(
      "Team member event is missing its business or Square ID.",
    );
  }

  /*
   * Retrieve the canonical Square record so the
   * integration health result reflects the current
   * Square team state.
   *
   * We deliberately do not overwrite the barber's
   * public display name, biography, featured status,
   * or other website-owned content.
   */
  const response = await canonical<{
    team_member?: AnyRecord;
  }>(
    `/v2/team-members/${encodeURIComponent(
      id,
    )}`,
    {
      team_member: raw,
    },
  );

  const teamMember = record(
    response.team_member ?? raw,
  );

  const {
    data: mappedProfile,
    error,
  } = await admin
    .from("barber_profiles")
    .select("id")
    .eq("business_id", business)
    .eq(
      "square_team_member_id",
      id,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    resource: "team_member",
    squareId: id,
    mapped: Boolean(
      mappedProfile?.id,
    ),
    status: text(
      teamMember.status,
    ),
  };
}


async function activateMembershipIfPaid(
  admin: NonNullable<ReturnType<typeof createUntypedAdminSupabase>>,
  payment: Record<string, unknown>,
) {
  const orderId = text(payment.order_id);
  const customerId = text(payment.customer_id);
  if (!orderId) return;

  const { data: intent } = await admin
    .from("membership_checkout_intents")
    .select("id,plan_id,business_id,email,name,phone,client_user_id,status,barber_profile_id,client_status")
    .eq("square_order_id", orderId)
    .maybeSingle();
  if (!intent || intent.status === "activated") return;

  await admin
    .from("membership_checkout_intents")
    .update({ status: "paid", square_customer_id: customerId ?? null, updated_at: new Date().toISOString() })
    .eq("id", intent.id);

  const { data: plan } = await admin
    .from("membership_plans")
    .select("square_catalog_id,billing_interval")
    .eq("id", intent.plan_id)
    .maybeSingle();
  if (!plan?.square_catalog_id || !customerId) {
    await admin
      .from("membership_checkout_intents")
      .update({ status: "failed", last_error: "No Square customer or plan variation available." })
      .eq("id", intent.id);
    return;
  }

  try {
    // Start the recurring cycle after the period just paid for, so the member
    // is never billed twice for the same window. A yearly plan renews in a
    // year, a monthly plan in a month.
    const startDate = new Date();
    if (plan.billing_interval === "year") {
      startDate.setFullYear(startDate.getFullYear() + 1);
    } else if (plan.billing_interval === "quarter") {
      startDate.setMonth(startDate.getMonth() + 3);
    } else if (plan.billing_interval === "week") {
      startDate.setDate(startDate.getDate() + 7);
    } else {
      startDate.setMonth(startDate.getMonth() + 1);
    }
    const subscription = await squareRequest<{ subscription?: { id?: string; status?: string } }>(
      "/v2/subscriptions",
      {
        method: "POST",
        idempotencyKey: `lbl-sub-${intent.id}`,
        body: {
          location_id: squareConfig.locationId,
          plan_variation_id: plan.square_catalog_id,
          customer_id: customerId,
          start_date: startDate.toISOString().slice(0, 10),
        },
      },
    );

    const subscriptionId = subscription.subscription?.id ?? null;

    if (intent.client_user_id) {
      await admin.from("memberships").insert({
        business_id: intent.business_id,
        client_user_id: intent.client_user_id,
        plan_id: intent.plan_id,
        square_subscription_id: subscriptionId,
        status: "active",
        starts_at: new Date().toISOString(),
        renews_at: startDate.toISOString(),
        metadata: { source: "website_checkout", email: intent.email },
      });
    }

    await admin
      .from("membership_checkout_intents")
      .update({
        status: "activated",
        square_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.id);

    // Notify the owner and the selected barber. Queued through the normal
    // notification pipeline so delivery is logged and retried like everything
    // else, rather than fired blind from inside the webhook.
    try {
      const { data: planRow } = await admin
        .from("membership_plans")
        .select("name,price_cents")
        .eq("id", intent.plan_id)
        .maybeSingle();
      const planLabel = (planRow?.name as { en?: string })?.en ?? "Membership";
      const amount = `$${(Number(planRow?.price_cents ?? 0) / 100).toFixed(2)}`;

      let barberName = "First available";
      let barberEmail: string | null = null;
      if (intent.barber_profile_id) {
        const { data: barber } = await admin
          .from("barber_profiles")
          .select("display_name,portal_email")
          .eq("id", intent.barber_profile_id)
          .maybeSingle();
        barberName = String(barber?.display_name ?? barberName);
        barberEmail = barber?.portal_email ? String(barber.portal_email) : null;
      }

      const summary = [
        `Member: ${intent.name ?? intent.email}`,
        `Email: ${intent.email}`,
        intent.phone ? `Phone: ${intent.phone}` : null,
        `Plan: ${planLabel} (${amount})`,
        `Barber: ${barberName}`,
        `Client status: ${intent.client_status ?? "not stated"}`,
        `Square subscription: ${subscriptionId ?? "pending"}`,
      ].filter(Boolean).join("\n");

      const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theluxurybarberlounge.com").replace(/\/$/, "");
      const renews = startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const cadence = plan.billing_interval === "year" ? "year" : "month";

      // 1. The member's own confirmation.
      const memberHtml = `<div style="font-family:Georgia,serif;background:#090909;color:#f4efe6;padding:32px">
        <div style="max-width:560px;margin:0 auto;border:1px solid #9d772e;padding:28px">
          <p style="margin:0;color:#c99a3e;letter-spacing:3px;text-transform:uppercase;font-size:10px">Membership confirmed</p>
          <h1 style="margin:10px 0 0;font-size:32px">Welcome to the Lounge.</h1>
          <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#cfc7b8">${intent.name ?? "Thank you"}, your ${planLabel} membership is active.</p>
          <table style="width:100%;margin:22px 0;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#8d8578">Plan</td><td style="padding:8px 0;text-align:right">${planLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#8d8578">Amount</td><td style="padding:8px 0;text-align:right">${amount} / ${cadence}</td></tr>
            <tr><td style="padding:8px 0;color:#8d8578">Your barber</td><td style="padding:8px 0;text-align:right">${barberName}</td></tr>
            <tr><td style="padding:8px 0;color:#8d8578">Renews</td><td style="padding:8px 0;text-align:right">${renews}</td></tr>
          </table>
          <p style="margin:0 0 20px;font-size:12px;line-height:1.7;color:#8d8578">Your card is stored securely by Square and will be charged automatically each ${cadence}. Cancel anytime with 30 days notice.</p>
          <a href="${site}/login?next=/client" style="display:inline-block;background:#c99a3e;color:#090909;padding:12px 22px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;font-size:11px">Open your portal</a>
          <p style="margin:22px 0 0;font-size:12px;color:#8d8578">801 Tilton Road, Suite 106A, Northfield, NJ 08225 · 609-338-1876</p>
        </div>
      </div>`;

      await admin.from("notification_jobs").insert({
        business_id: intent.business_id,
        channel: "email",
        template_key: "membership_confirmed_member",
        recipient: intent.email,
        subject: `Your ${planLabel} membership is active`,
        body: memberHtml,
        status: "queued",
        scheduled_for: new Date().toISOString(),
      });

      // 2. Owner and the selected barber get the operational detail.
      const recipients = ["info@theluxurybarberlounge.com", barberEmail].filter(Boolean) as string[];
      for (const to of recipients) {
        await admin.from("notification_jobs").insert({
          business_id: intent.business_id,
          channel: "email",
          template_key: "membership_activated",
          recipient: to,
          subject: `New membership: ${planLabel} — ${intent.name ?? intent.email}`,
          body: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${summary}\nRenews: ${renews}</pre>`,
          status: "queued",
          scheduled_for: new Date().toISOString(),
        });
      }

      const { processNotificationJobs } = await import("@/lib/notifications/process");
      await processNotificationJobs(admin, { limit: 10 });
    } catch {
      // Membership is active regardless; notification failure must not undo it.
    }
  } catch (error) {
    // The member has paid; enrolment needs manual completion by an admin.
    await admin
      .from("membership_checkout_intents")
      .update({ status: "failed", last_error: String(error).slice(0, 500) })
      .eq("id", intent.id);
  }
}

export async function processSquareWebhookEvent(
  event: WebhookEventRow,
) {
  const object =
    nestedObject(event.payload);

  if (
    event.event_type.startsWith(
      "booking.",
    )
  ) {
    return syncBooking(
      event,
      record(object.booking),
    );
  }

  if (
    event.event_type.startsWith(
      "payment.",
    )
  ) {
    return syncPayment(
      event,
      record(object.payment),
    );
  }

  if (
    event.event_type.startsWith(
      "refund.",
    )
  ) {
    return syncRefund(
      event,
      record(object.refund),
    );
  }

  if (
    event.event_type.startsWith(
      "order.",
    )
  ) {
    return syncOrder(
      event,
      record(object.order),
    );
  }

  if (
    event.event_type.startsWith(
      "customer.",
    )
  ) {
    return syncCustomer(
      event,
      record(object.customer),
    );
  }

  if (
    event.event_type ===
    "catalog.version.updated"
  ) {
    return syncCatalog(event);
  }

  if (
    event.event_type.startsWith(
      "team_member.",
    )
  ) {
    return syncTeamMember(
      event,
      record(object.team_member),
    );
  }

  return {
    resource: "ignored",
    reason:
      "No canonical sync handler is required for this event type.",
  };
}

export async function processWebhookInbox(
  limit = 25,
) {
  const admin =
    createUntypedAdminSupabase();

  if (!admin) {
    return {
      processed: 0,
      failed: 0,
      ignored: 0,
      configured: false,
    };
  }

  const {
    data: rows,
    error,
  } = await admin
    .from("webhook_events")
    .select(
      "id,business_id,event_type,payload,attempt_count",
    )
    .in(
      "processing_status",
      ["received", "retrying"],
    )
    .order("received_at", {
      ascending: true,
    })
    .limit(
      Math.max(
        1,
        Math.min(limit, 100),
      ),
    );

  if (error) {
    throw error;
  }

  let processed = 0;
  let failed = 0;
  let ignored = 0;

  for (const row of rows ?? []) {
    const event =
      row as WebhookEventRow;

    const attempt =
      (event.attempt_count ?? 0) +
      1;

    const started =
      new Date().toISOString();

    await admin
      .from("webhook_events")
      .update({
        processing_status:
          "processing",
        attempt_count: attempt,
        last_error: null,
      })
      .eq("id", event.id)
      .in(
        "processing_status",
        ["received", "retrying"],
      );

    const {
      data: attemptRow,
    } = await admin
      .from("webhook_attempts")
      .insert({
        webhook_event_id:
          event.id,
        attempt,
        status: "processing",
        started_at: started,
      })
      .select("id")
      .single();

    try {
      const result =
        await processSquareWebhookEvent(
          event,
        );

      const isIgnored =
        result.resource ===
        "ignored";

      await admin
        .from("webhook_events")
        .update({
          processing_status:
            isIgnored
              ? "ignored"
              : "processed",
          processed_at:
            new Date().toISOString(),
          last_error: null,
        })
        .eq("id", event.id);

      if (attemptRow?.id) {
        await admin
          .from("webhook_attempts")
          .update({
            status: isIgnored
              ? "ignored"
              : "processed",
            completed_at:
              new Date().toISOString(),
            result,
          })
          .eq("id", attemptRow.id);
      }

      if (isIgnored) {
        ignored += 1;
      } else {
        processed += 1;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(
              0,
              1000,
            )
          : "Unknown webhook processing error";

      const dead =
        attempt >= 5;

      await admin
        .from("webhook_events")
        .update({
          processing_status:
            dead
              ? "dead_letter"
              : "failed",
          last_error: message,
        })
        .eq("id", event.id);

      if (attemptRow?.id) {
        await admin
          .from("webhook_attempts")
          .update({
            status: "failed",
            completed_at:
              new Date().toISOString(),
            error_message: message,
          })
          .eq("id", attemptRow.id);
      }

      failed += 1;
    }
  }

  return {
    processed,
    failed,
    ignored,
    configured: true,
  };
}
