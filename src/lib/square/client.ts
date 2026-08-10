import "server-only";

import { squareBaseUrl, squareConfig } from "./config";

export class SquareConfigurationError extends Error {}

export class SquareApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "SquareApiError";
  }
}

type SquareRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
};

export async function squareRequest<T = unknown>(
  path: string,
  options: SquareRequestOptions = {},
): Promise<T> {
  if (!squareConfig.accessToken) {
    throw new SquareConfigurationError(
      "Square access token is not configured.",
    );
  }

  /*
   * Square write endpoints expect idempotency_key in the JSON body.
   *
   * Keeping idempotencyKey as an internal camelCase option lets the
   * booking provider use one consistent interface while this client
   * converts it to Square's expected request shape.
   */
  const requestBody =
    options.body === undefined
      ? undefined
      : options.idempotencyKey &&
          typeof options.body === "object" &&
          options.body !== null &&
          !Array.isArray(options.body)
        ? {
            ...(options.body as Record<string, unknown>),
            idempotency_key: options.idempotencyKey,
          }
        : options.body;

  const response = await fetch(
    `${squareBaseUrl}${path}`,
    {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${squareConfig.accessToken}`,
        "Square-Version": squareConfig.apiVersion,
        "Content-Type": "application/json",
      },
      body:
        requestBody === undefined
          ? undefined
          : JSON.stringify(requestBody),
      cache: "no-store",
    },
  );

  const payload = (await response
    .json()
    .catch(() => null)) as
    | T
    | { errors?: unknown }
    | null;

  if (!response.ok) {
    throw new SquareApiError(
      "Square request failed.",
      response.status,
      payload,
    );
  }

  return payload as T;
}

export type SquareAvailability = {
  start_at: string;
  location_id: string;
  appointment_segments: Array<{
    duration_minutes: number;
    team_member_id: string;
    service_variation_id: string;
    service_variation_version: number;
  }>;
};

export async function searchAvailability(input: {
  startAt: string;
  endAt: string;
  serviceVariationId: string;
  teamMemberIds?: string[];
}) {
  if (!squareConfig.locationId) {
    throw new SquareConfigurationError(
      "Square location ID is not configured.",
    );
  }

  return squareRequest<{
    availabilities?: SquareAvailability[];
  }>("/v2/bookings/availability/search", {
    method: "POST",
    body: {
      query: {
        filter: {
          start_at_range: {
            start_at: input.startAt,
            end_at: input.endAt,
          },
          location_id: squareConfig.locationId,
          segment_filters: [
            {
              service_variation_id:
                input.serviceVariationId,
              ...(input.teamMemberIds?.length
                ? {
                    team_member_id_filter: {
                      any: input.teamMemberIds,
                    },
                  }
                : {}),
            },
          ],
        },
      },
    },
  });
}