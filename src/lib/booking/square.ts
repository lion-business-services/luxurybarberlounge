import { randomUUID } from "node:crypto";

import { squareConfig } from "../square/config.ts";
import {
  searchAvailability as searchSquareAvailability,
  squareRequest,
} from "../square/client.ts";
import type {
  BookingInput,
  BookingLocation,
  BookingProvider,
  BookingRecord,
  BookingService,
  BookingTeamMember,
} from "./provider.ts";

export class SquareBookingProvider implements BookingProvider {
  readonly mode =
    squareConfig.environment === "production"
      ? ("square-production" as const)
      : ("square-sandbox" as const);

  async listLocations(): Promise<BookingLocation[]> {
    const payload = await squareRequest<{
      locations?: Array<{
        id: string;
        name?: string;
        timezone?: string;
        address?: Record<string, string>;
      }>;
    }>("/v2/locations");

    return (payload.locations ?? []).map((item) => ({
      id: item.id,
      name: item.name ?? "Square location",
      timezone: item.timezone ?? "America/New_York",
      address: Object.values(item.address ?? {})
        .filter(Boolean)
        .join(", "),
      live: true,
    }));
  }

  async listServices(): Promise<BookingService[]> {
    const payload = await squareRequest<{
      objects?: Array<Record<string, unknown>>;
    }>("/v2/catalog/list?types=ITEM,ITEM_VARIATION");

    return (payload.objects ?? [])
      .filter((object) => object.type === "ITEM_VARIATION")
      .map((object) => {
        const data = (object.item_variation_data ?? {}) as Record<
          string,
          unknown
        >;

        const price = (data.price_money ?? {}) as Record<
          string,
          unknown
        >;

        return {
          id: String(object.id),
          slug: String(object.id),
          name: String(data.name ?? "Square service"),
          description: "Live Square catalog service.",
          durationMinutes:
            Number(data.service_duration ?? 0) / 60_000 || 30,
          priceCents: Number(price.amount ?? 0),
          depositCents: 0,
          live: true,
        };
      });
  }

  async listTeamMembers(): Promise<BookingTeamMember[]> {
    const payload = await squareRequest<{
      team_members?: Array<{
        id: string;
        given_name?: string;
        family_name?: string;
        status?: string;
      }>;
    }>("/v2/team-members/search", {
      method: "POST",
      body: {
        query: {
          filter: {
            status: "ACTIVE",
          },
        },
        limit: 200,
      },
    });

    return (payload.team_members ?? []).map((member) => ({
      id: member.id,
      slug: member.id,
      displayName:
        [member.given_name, member.family_name]
          .filter(Boolean)
          .join(" ") || "Team member",
      serviceIds: [],
      live: true,
    }));
  }

  async searchAvailability(input: {
    locationId: string;
    serviceId: string;
    startAt: string;
    endAt: string;
    teamMemberIds?: string[];
  }) {
    const payload = await searchSquareAvailability({
      startAt: input.startAt,
      endAt: input.endAt,
      serviceVariationId: input.serviceId,
      teamMemberIds: input.teamMemberIds,
    });

    return (payload.availabilities ?? []).map(
      (availability, index) => {
        const segment = availability.appointment_segments[0];

        const end = new Date(
          new Date(availability.start_at).getTime() +
            (segment?.duration_minutes ?? 30) * 60_000,
        );

        return {
          id: `${availability.start_at}-${segment?.team_member_id ?? index}`,
          startsAt: availability.start_at,
          endsAt: end.toISOString(),
          locationId: availability.location_id,
          teamMemberId: segment?.team_member_id ?? "",
          serviceId:
            segment?.service_variation_id ?? input.serviceId,
          live: true,
        };
      },
    );
  }

  async createCustomer(input: {
    givenName: string;
    familyName?: string;
    email?: string;
    phone?: string;
    idempotencyKey: string;
  }) {
    const payload = await squareRequest<{
      customer?: {
        id: string;
      };
    }>("/v2/customers", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        given_name: input.givenName,
        family_name: input.familyName,
        email_address: input.email,
        phone_number: input.phone,
      },
    });

    if (!payload.customer?.id) {
      throw new Error(
        "Square did not return a customer ID.",
      );
    }

    return {
      id: payload.customer.id,
      live: true,
    };
  }

  async createBooking(
    input: BookingInput,
  ): Promise<BookingRecord> {
    /*
     * Square requires the current version of the service variation
     * when creating an appointment segment.
     *
     * input.serviceId is already the mapped Square ITEM_VARIATION ID.
     */
    const catalogPayload = await squareRequest<{
      object?: {
        id?: string;
        type?: string;
        version?: number;
      };
    }>(
      `/v2/catalog/object/${encodeURIComponent(
        input.serviceId,
      )}`,
    );

    const catalogObject = catalogPayload.object;

    if (!catalogObject?.id) {
      throw new Error(
        "Square did not return the mapped service variation.",
      );
    }

    if (catalogObject.type !== "ITEM_VARIATION") {
      throw new Error(
        "Mapped Square catalog object is not a service variation.",
      );
    }

    const serviceVariationVersion = Number(
      catalogObject.version ?? 0,
    );

    if (
      !Number.isFinite(serviceVariationVersion) ||
      serviceVariationVersion <= 0
    ) {
      throw new Error(
        "Square did not return a valid service variation version.",
      );
    }

    if (!input.teamMemberId) {
      throw new Error(
        "Square booking requires a mapped team member.",
      );
    }

    const payload = await squareRequest<{
      booking?: Record<string, unknown>;
    }>("/v2/bookings", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        booking: {
          location_id: input.locationId,
          customer_id: input.customerId,
          start_at: input.startsAt,
          customer_note: input.notes,
          appointment_segments: [
            {
              service_variation_id: input.serviceId,
              service_variation_version:
                serviceVariationVersion,
              team_member_id: input.teamMemberId,
            },
          ],
        },
      },
    });

    if (!payload.booking) {
      throw new Error(
        "Square did not return a booking.",
      );
    }

    return normalizeBooking(
      payload.booking,
      input,
    );
  }

  async updateBooking(
    id: string,
    patch: Partial<
      Pick<
        BookingInput,
        "startsAt" | "teamMemberId" | "notes"
      >
    >,
    idempotencyKey: string,
  ): Promise<BookingRecord> {
    const current = await this.getBooking(id);

    if (!current) {
      throw new Error(
        "Square booking not found.",
      );
    }

    const payload = await squareRequest<{
      booking?: Record<string, unknown>;
    }>(
      `/v2/bookings/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        idempotencyKey,
        body: {
          booking: {
            start_at: patch.startsAt,
            customer_note: patch.notes,
            appointment_segments:
              patch.teamMemberId
                ? [
                    {
                      team_member_id:
                        patch.teamMemberId,
                    },
                  ]
                : undefined,
          },
        },
      },
    );

    return normalizeBooking(
      payload.booking,
      {
        ...current,
        ...patch,
        idempotencyKey,
      } as BookingInput,
    );
  }

  async cancelBooking(
    id: string,
    idempotencyKey: string,
  ): Promise<BookingRecord> {
    const payload = await squareRequest<{
      booking?: Record<string, unknown>;
    }>(
      `/v2/bookings/${encodeURIComponent(
        id,
      )}/cancel`,
      {
        method: "POST",
        idempotencyKey,
        body: {},
      },
    );

    const normalized = normalizeBooking(
      payload.booking,
      {
        locationId: "",
        serviceId: "",
        customerId: "",
        startsAt: new Date().toISOString(),
        idempotencyKey,
      },
    );

    return {
      ...normalized,
      status: "CANCELLED",
    };
  }

  async getBooking(
    id: string,
  ): Promise<BookingRecord | null> {
    const payload = await squareRequest<{
      booking?: Record<string, unknown>;
    }>(
      `/v2/bookings/${encodeURIComponent(id)}`,
    );

    return payload.booking
      ? normalizeBooking(payload.booking, {
          locationId: "",
          serviceId: "",
          customerId: "",
          startsAt: new Date().toISOString(),
          idempotencyKey: randomUUID(),
        })
      : null;
  }

  async getPaymentStatus(
    bookingId: string,
  ) {
    return {
      bookingId,
      status: "UNKNOWN" as const,
      amountCents: 0,
      live: true,
    };
  }
}

function normalizeBooking(
  raw: Record<string, unknown> | undefined,
  fallback: BookingInput,
): BookingRecord {
  const segments = Array.isArray(
    raw?.appointment_segments,
  )
    ? (raw.appointment_segments as Array<
        Record<string, unknown>
      >)
    : [];

  const segment = segments[0] ?? {};

  const rawStatus = String(
    raw?.status ?? "PENDING",
  );

  return {
    id: String(
      raw?.id ??
        `square-pending-${fallback.idempotencyKey}`,
    ),

    status:
      rawStatus === "CANCELLED_BY_CUSTOMER" ||
      rawStatus === "CANCELLED_BY_SELLER"
        ? "CANCELLED"
        : rawStatus === "ACCEPTED"
          ? "ACCEPTED"
          : "PENDING",

    startsAt: String(
      raw?.start_at ?? fallback.startsAt,
    ),

    locationId: String(
      raw?.location_id ??
        fallback.locationId,
    ),

    serviceId: String(
      segment.service_variation_id ??
        fallback.serviceId,
    ),

    teamMemberId:
      String(
        segment.team_member_id ??
          fallback.teamMemberId ??
          "",
      ) || undefined,

    customerId: String(
      raw?.customer_id ??
        fallback.customerId,
    ),

    live: true,
  };
}