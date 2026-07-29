export type MessageRequest = {
  recipient: string;
  subject?: string;
  body: string;
  html?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type MessageResult = { provider: string; providerMessageId: string; status: "accepted" | "development"; live: boolean };
export interface EmailProvider { send(input: MessageRequest): Promise<MessageResult>; }
export interface SmsProvider { send(input: MessageRequest): Promise<MessageResult>; }

export class DevelopmentEmailProvider implements EmailProvider {
  async send(input: MessageRequest): Promise<MessageResult> { return { provider: "development-email", providerMessageId: `dev-email-${input.idempotencyKey}`, status: "development", live: false }; }
}
export class DevelopmentSmsProvider implements SmsProvider {
  async send(input: MessageRequest): Promise<MessageResult> { return { provider: "development-sms", providerMessageId: `dev-sms-${input.idempotencyKey}`, status: "development", live: false }; }
}

export class ResendEmailProvider implements EmailProvider {
  async send(input: MessageRequest): Promise<MessageResult> {
    const key = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
    if (!key || !from) throw new Error("Resend credentials are incomplete.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": input.idempotencyKey },
      body: JSON.stringify({ from, to: [input.recipient], subject: input.subject || "Luxury Barber Lounge", text: input.body, html: input.html, reply_to: process.env.RESEND_REPLY_TO_EMAIL || process.env.EMAIL_REPLY_TO }),
    });
    const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok || !payload?.id) throw new Error(payload?.message || "Resend rejected the email request.");
    return { provider: "resend", providerMessageId: payload.id, status: "accepted", live: true };
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async send(input: MessageRequest): Promise<MessageResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error("Twilio credentials are incomplete.");
    const body = new URLSearchParams({ To: input.recipient, From: from, Body: input.body });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body });
    const payload = await response.json().catch(() => null) as { sid?: string; message?: string } | null;
    if (!response.ok || !payload?.sid) throw new Error(payload?.message || "Twilio rejected the SMS request.");
    return { provider: "twilio", providerMessageId: payload.sid, status: "accepted", live: true };
  }
}

export function getEmailProvider(): EmailProvider {
  const configured = Boolean((process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY) && (process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM));
  return configured ? new ResendEmailProvider() : new DevelopmentEmailProvider();
}
export function getSmsProvider(): SmsProvider {
  return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM ? new TwilioSmsProvider() : new DevelopmentSmsProvider();
}
