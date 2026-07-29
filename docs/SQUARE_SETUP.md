# Square Setup

Square remains the operational and financial source of truth. The application extends Square; it does not silently replace it.

Official references:

- https://developer.squareup.com/docs/overview
- https://developer.squareup.com/docs/bookings-api/what-it-does
- https://developer.squareup.com/docs/webhooks/overview
- https://developer.squareup.com/docs/webhooks/step3validate

## Sandbox activation

1. Create or select the Square developer application.
2. Use the sandbox environment first.
3. Record sandbox application ID, access token, and location ID.
4. Set `SQUARE_ENVIRONMENT=sandbox`.
5. Map Square location, team members, catalog service variations, and customers to Supabase records.
6. Test catalog read and availability search.
7. Create representative sandbox bookings, deposits, tips, refunds, and multi-service orders.

## Webhook activation

1. Set the notification URL to `https://YOUR_DOMAIN/api/square/webhooks`.
2. Record the webhook signature key as `SQUARE_WEBHOOK_SIGNATURE_KEY`.
3. Set `SQUARE_WEBHOOK_NOTIFICATION_URL` to the exact same URL used in Square configuration. Signature verification depends on an exact match.
4. Subscribe only to required event types.
5. Send Square test events.
6. Verify invalid signatures are rejected, duplicate event IDs are idempotent, and failed events remain visible to authorized admins.

## Production activation

Production uses separate credentials and mappings. Re-run all sandbox scenarios in a controlled production validation window before turning on public live booking. Never expose access tokens in browser bundles.

## Reconciliation boundaries

- Square records bookings, orders, payments, tips, deposits, refunds, and transaction status.
- Supabase records extensions, attribution, rules, calculation lines, statements, disputes, and audit history.
- The platform does not auto-transfer barber settlement funds.

## Webhook processing and recovery

Verified events are stored in `webhook_events` once by provider event ID. `/api/cron/webhooks` processes the inbox with attempt records, canonical resource retrieval when Square credentials are present, local synchronization, retry limits, and dead-letter state. Authorized managers review and retry events at `/admin/webhooks`. Configure `CRON_SECRET` in Vercel.
