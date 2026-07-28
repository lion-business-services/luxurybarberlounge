import { squareBaseUrl, squareConfig } from "./config";

export class SquareConfigurationError extends Error {}
export class SquareApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

type SquareRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
};

export async function squareRequest<T>(path: string, options: SquareRequestOptions = {}): Promise<T> {
  if (!squareConfig.accessToken) {
    throw new SquareConfigurationError("Square access token is not configured.");
  }

  const response = await fetch(`${squareBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      "Square-Version": squareConfig.apiVersion,
      "Content-Type": "application/json",
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | { errors?: unknown } | null;
  if (!response.ok) {
    throw new SquareApiError("Square request failed.", response.status, payload);
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
    throw new SquareConfigurationError("Square location ID is not configured.");
  }

  return squareRequest<{ availabilities?: SquareAvailability[] }>(
    "/v2/bookings/availability/search",
    {
      method: "POST",
      body: {
        query: {
          filter: {
            start_at_range: { start_at: input.startAt, end_at: input.endAt },
            location_id: squareConfig.locationId,
            segment_filters: [
              {
                service_variation_id: input.serviceVariationId,
                ...(input.teamMemberIds?.length
                  ? { team_member_id_filter: { any: input.teamMemberIds } }
                  : {}),
              },
            ],
          },
        },
      },
    },
  );
}
