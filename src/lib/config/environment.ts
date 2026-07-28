export const environment = {
  supabaseConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  supabaseAdminConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  squareConfigured: Boolean(
    process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID,
  ),
  squareWebhookConfigured: Boolean(
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY && process.env.SQUARE_WEBHOOK_NOTIFICATION_URL,
  ),
  emailConfigured: Boolean(process.env.EMAIL_PROVIDER_API_KEY && process.env.EMAIL_FROM),
  smsConfigured: Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM,
  ),
  aiConfigured: Boolean(process.env.AI_PROVIDER_API_KEY),
} as const;
