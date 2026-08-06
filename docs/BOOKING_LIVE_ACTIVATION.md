# Booking Live Activation

Apply all migrations in order through `202608060016_final_client_content_release.sql`. Migration 016 is the final authoritative content release and supersedes earlier provisional launch snapshots when a clean database is built.

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
