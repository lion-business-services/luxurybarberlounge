import "server-only";

import { createUntypedAdminSupabase } from "@/lib/auth/server";
import {
  squareRequest,
  SquareConfigurationError,
} from "@/lib/square/client";

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
                ? `Your Luxury Barber Lounge appointment is scheduled for ${when}. We look forward to welcoming you. Call 609-384-5171 if you need assistance.`
                : `Your Luxury Barber Lounge appointment for ${when} is now ${status}. Call 609-384-5171 if you need assistance.`,
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
