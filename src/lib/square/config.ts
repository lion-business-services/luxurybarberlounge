export const squareConfig = {
 environment: process.env.SQUARE_ENVIRONMENT ?? "sandbox",
 applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
 locationId: process.env.SQUARE_LOCATION_ID,
 accessToken: process.env.SQUARE_ACCESS_TOKEN,
 webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
};
export const squareIsConfigured = Boolean(squareConfig.locationId && squareConfig.accessToken);
