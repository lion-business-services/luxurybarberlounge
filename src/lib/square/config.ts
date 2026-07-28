export type SquareEnvironment = "sandbox" | "production";

export const squareConfig = {
  environment: (process.env.SQUARE_ENVIRONMENT ?? "sandbox") as SquareEnvironment,
  apiVersion: process.env.SQUARE_API_VERSION ?? "2026-07-15",
  applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
  locationId: process.env.SQUARE_LOCATION_ID,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  webhookNotificationUrl: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL,
  fallbackBookingUrl: process.env.NEXT_PUBLIC_SQUARE_BOOKING_URL,
} as const;

export const squareBaseUrl =
  squareConfig.environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

export const squareIsConfigured = Boolean(squareConfig.locationId && squareConfig.accessToken);
