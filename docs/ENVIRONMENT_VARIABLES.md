# Environment Variables

Copy `.env.example` to `.env.local`. Values marked server-only must never use a `NEXT_PUBLIC_` prefix.

## Public application

- `NEXT_PUBLIC_SITE_URL`: canonical HTTPS site URL.
- `NEXT_PUBLIC_PORTAL_DEMO_MODE`: development-only portal demonstration switch. Keep `false` in production.
- Public feature flags: control visible integrations without exposing secrets.

## Supabase

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public anonymous key protected by RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only administrative key.
- `INITIAL_OWNER_EMAIL`: verified email bootstrapped to the owner role after successful OTP. Use `info@theluxurybarberlounge.com`.

## Resend and email

- `RESEND_API_KEY`: server-only API key for application email jobs.
- `RESEND_FROM_EMAIL`: verified sender, for example `Luxury Barber Lounge <access@theluxurybarberlounge.com>`.
- `RESEND_REPLY_TO_EMAIL`: `info@theluxurybarberlounge.com`.
- Supabase Auth OTP mail is delivered through Supabase custom SMTP configured with Resend. SMTP credentials belong in the Supabase dashboard, not this repository.

## Square

- `SQUARE_ENVIRONMENT`: `sandbox` or `production`.
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID`: public application identifier.
- `SQUARE_ACCESS_TOKEN`: server-only.
- `SQUARE_LOCATION_ID`: server-only operational location mapping.
- `SQUARE_WEBHOOK_SIGNATURE_KEY`: server-only.
- `SQUARE_WEBHOOK_NOTIFICATION_URL`: exact public webhook URL used in signature verification.
- `NEXT_PUBLIC_SQUARE_BOOKING_URL`: safe fallback booking URL.

## Jobs and optional providers

- `CRON_SECRET`: protects scheduled job endpoints.
- SMS and AI provider values are server-only and optional.

Vercel values must be configured separately for Development, Preview, and Production. Production flags should remain off until the corresponding activation checklist passes.
