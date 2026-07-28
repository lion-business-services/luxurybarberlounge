import { createHmac, timingSafeEqual } from "node:crypto";
import { squareConfig } from "./config";

export function verifySquareWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const key = squareConfig.webhookSignatureKey;
  const notificationUrl = squareConfig.webhookNotificationUrl;
  if (!key || !notificationUrl || !input.signatureHeader) return false;

  const expected = createHmac("sha256", key)
    .update(notificationUrl + input.rawBody)
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(input.signatureHeader);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
