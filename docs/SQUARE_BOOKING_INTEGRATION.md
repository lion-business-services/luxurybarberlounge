# Square Booking Integration

## Current state

Supabase is the production-capable booking source until Square production credentials and mappings are verified. The interface and normalized mapping tables preserve a clean migration path.

## Required before enabling Square as source of truth

- Production access token
- Location ID
- Webhook signature key and production notification URL
- Bookings permissions
- Bookable service variation IDs
- Team-member booking profile IDs
- Customer mapping
- Sandbox and production create/update/cancel tests
- Webhook replay and idempotency tests

Keep `NEXT_PUBLIC_FEATURE_LIVE_SQUARE`, booking flags, and membership billing false until those checks pass. Never display Square confirmation unless Square successfully created the booking.
