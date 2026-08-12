# Integration Status

## Supabase

- Connected project: `luxury-barber-lounge` (`xdggtawvapftqgwifwqx`).
- Migration `barber_portals_commissions_queue_payments` was applied successfully on 2026-08-12.
- Six owner-provided barber portal emails are mapped to public barber profiles.
- `support@lbsprocess.com` is seeded as a private barber test invitation.
- `appointment_payment_links` exists and commission calculations are linked to modern appointments.
- The supplied server credential resolves to the expected Supabase project and `service_role` claim.
- `.env.production.local` contains the supplied deployment credentials and is ignored by Git. Do not commit or publish it.

## Square Sandbox

- API version: `2026-07-15`.
- The supplied Sandbox application, access token, location, and webhook signature values are provisioned in `.env.production.local`.
- The webhook notification URL is exactly `https://www.theluxurybarberlounge.com/api/square/webhooks`.
- Square synchronization runs automatically through `/api/cron/square-sync` every ten minutes.
- The synchronization job verifies the configured location, stores Square location/team/catalog mirrors, safely auto-maps barbers by exact portal email or exact unique name, and maps bookable services only on exact unique service matches.
- Webhook ingestion remains signature-verified and idempotent, then background processing synchronizes bookings, payments, refunds, orders, customers, catalog changes, and team-member events.
- Commission reconciliation is enabled for Sandbox synchronization so end-to-end calculations can be tested.
- Public Square Bookings remain disabled while Sandbox credentials are installed. This prevents real visitors from creating fake Sandbox appointments.
- Sandbox deposit checkout is restricted to authorized test bookings using `support@lbsprocess.com`.

## Production Square Cutover

Sandbox credentials cannot accept real production payments. Before public Square booking and real payment go-live, replace the four Sandbox Square credentials with the production application/token/location/webhook signature values, change `SQUARE_ENVIRONMENT=production`, confirm the production webhook subscription, run the Square sync successfully, and then enable `NEXT_PUBLIC_FEATURE_SQUARE_BOOKINGS` and `NEXT_PUBLIC_FEATURE_SQUARE_LIVE_BOOKING`.

## Other Provider-Gated Automations

Booking fallback delivery to the lounge uses FormSubmit. Transactional client/barber email and SMS remain provider-gated until Resend/email and Twilio credentials are supplied; the system keeps those jobs queued rather than pretending delivery occurred.
