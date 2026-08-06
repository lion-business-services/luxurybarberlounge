# Booking Live Activation

Apply all migrations in order through `202608060017_ruben_live_booking_release.sql`. Migration 016 is the authoritative client-intake content release. Migration 017 adds Ruben, consolidates duplicate owner/barber records, installs responsive image metadata, and creates the privacy-safe public catalog RPC used by `/book`.

Before enabling live booking:

1. Configure the production Supabase URL, anon key, and server-only service-role key.
2. Apply migrations and run live RLS tests.
3. Configure `BOOKING_MANAGE_SECRET` and production application URLs.
4. Verify staff accounts, barber links, schedules, breaks, and time off.
5. Activate FormSubmit and/or Resend, then verify delivery and retry logs.
6. Configure protected cron schedules.
7. Keep Square flags disabled until location, catalog, team-member, customer, and webhook mappings pass QA.
8. Run lint, semantic type checking, production build, browser/device QA, accessibility checks, and an end-to-end double-booking test.

Barber Lo's remains unavailable for online scheduling until working days are confirmed. Angelica is enabled only for the confirmed Wednesday schedule.
