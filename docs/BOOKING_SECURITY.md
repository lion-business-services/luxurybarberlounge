# Booking Security

- Server-only booking creation
- Zod validation and output-safe errors
- Honeypot and strict field limits
- In-process and durable database throttling
- Postgres overlap constraints and advisory locks
- UUID identifiers and unpredictable public references
- Hashed manage tokens with constant-time comparison
- Service-role isolation
- RLS for client, barber, reception, and admin access
- Signed private reference-image URLs
- Consent records and policy versioning
- Redacted logs and no payment-card handling
- Immutable audit and status history

Production requires `BOOKING_MANAGE_SECRET`; the code refuses a fixed fallback in production.
