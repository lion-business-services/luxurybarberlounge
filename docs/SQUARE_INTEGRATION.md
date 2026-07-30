# Square Integration

Square remains the booking and financial source of truth. Supabase stores normalized mirrors, identity mappings, portal metadata, queue extensions, attribution, automation records, and reconciliation state.

## Required credentials

- `SQUARE_ENVIRONMENT`
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `SQUARE_WEBHOOK_NOTIFICATION_URL`
- `NEXT_PUBLIC_SQUARE_BOOKING_URL`

## Required mappings

Verify location, team member, service/catalog variation, customer, booking, order, payment, refund, package, gift card, and membership mappings in sandbox before production.

## Webhooks

The webhook route verifies the Square signature against the exact notification URL, stores provider event IDs idempotently, and records attempts, failures, retry state, and dead-letter status. Never retry by replaying unverified bodies or bypassing signature validation.

## Activation

Keep all Square feature flags false until sandbox booking, reschedule, cancellation, customer matching, order/payment/refund synchronization, out-of-order events, duplicates, and reconciliation have passed. See `docs/SQUARE_SETUP.md` for dashboard steps.
