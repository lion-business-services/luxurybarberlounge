export type MessageRequest = {
  recipient: string;
  subject?: string;
  body: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type MessageResult = {
  provider: string;
  providerMessageId: string;
  status: "accepted" | "development";
  live: boolean;
};

export interface EmailProvider { send(input: MessageRequest): Promise<MessageResult>; }
export interface SmsProvider { send(input: MessageRequest): Promise<MessageResult>; }

export class DevelopmentEmailProvider implements EmailProvider {
  async send(input: MessageRequest): Promise<MessageResult> {
    return { provider: "development-email", providerMessageId: `dev-email-${input.idempotencyKey}`, status: "development", live: false };
  }
}

export class DevelopmentSmsProvider implements SmsProvider {
  async send(input: MessageRequest): Promise<MessageResult> {
    return { provider: "development-sms", providerMessageId: `dev-sms-${input.idempotencyKey}`, status: "development", live: false };
  }
}

export class ConfiguredEmailProvider implements EmailProvider {
  async send(): Promise<MessageResult> {
    throw new Error("Production email adapter is not activated. Configure the selected provider before enabling live delivery.");
  }
}

export class ConfiguredSmsProvider implements SmsProvider {
  async send(): Promise<MessageResult> {
    throw new Error("Production SMS adapter is not activated. Configure the selected provider before enabling live delivery.");
  }
}

export function getEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER_API_KEY ? new ConfiguredEmailProvider() : new DevelopmentEmailProvider();
}

export function getSmsProvider(): SmsProvider {
  return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? new ConfiguredSmsProvider() : new DevelopmentSmsProvider();
}
