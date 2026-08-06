# Luxury Barber Lounge Final Operational Release v10

## Purpose

This release turns the approved public website into a focused operating platform for the Northfield shop. The owner dashboard is intentionally not a CRM or developer console. The client portal is intentionally not a database viewer. Technical processors run in the background while each user sees only the tasks and records relevant to them.

## Owner dashboard

Daily navigation is limited to:

- Dashboard
- Appointments
- Queue
- Clients
- Barbers
- Services
- Memberships
- Commissions

The automation and settings pages redirect to the dashboard. Protected processors remain available only as server routes and scheduled jobs.

## Client portal

Primary navigation is limited to:

- Home
- Visits
- Queue
- Account

The client sees only their own appointments, queue entry, receipts, membership, profile, preferences, and support. Internal provider IDs and operational configuration are not rendered.

## Session behavior

Supabase access tokens are validated server-side. Expired access tokens are silently renewed from the secure refresh-token cookie. Authenticated users can visit public pages and return to their dashboard without being signed out. Sign-out clears the secure authentication cookies.

## Walk-in queue

- Digital check-in validates an active service.
- Duplicate active entries are prevented.
- Wait estimates use current work and available barbers.
- Assignment considers queue order, due appointments, service eligibility, requested barber, availability, and projected workload.
- Manual assignment and every status change are recorded in history and audit logs.
- Completing or removing a guest releases the assignment and attempts the next eligible match.
- The queue recovery job reconciles the queue every five minutes.
- Assignment and called/ready changes queue transactional client notifications when an approved delivery channel exists.

## In-shop television display

The public display is available at `/queue-board` and refreshes every five seconds. Its API returns no phone number, email address, full private identity, client ID, or service detail. A name appears only after explicit consent and is reduced to a privacy-safe first name plus last initial. Otherwise, a short guest token is shown.

## Appointments and messages

Square remains the source of truth for live bookings. Valid signed webhook events synchronize bookings, customers, orders, payments, and refunds. Booking creation and updates queue transactional email content. A protected appointment processor queues one 24-hour reminder per eligible confirmed booking.

## Barbers and services

Each barber account can be invited and linked through verified OTP login. The owner can manage profile state, availability, walk-in acceptance, specialties, languages, booking connection status, and the exact services the barber is qualified to perform. Automatic queue assignment uses that service eligibility.

## Memberships

Approved plans and active memberships are managed from one owner page. Billing-dependent actions remain provider-gated and must not claim completion until Square confirms them.

## Commission controls

The implemented locked policy is:

- SHOP client: 70% barber / 30% shop.
- Approved pre-existing BARBER client: 100% barber.
- Tips: 100% barber and outside commission basis.
- Walk-ins default to SHOP.
- Default attribution is SHOP unless approved evidence supports BARBER.
- Claim/dispute window: 24 hours.
- Settlement week: Monday through Sunday.
- Owner payment remains manual by the approved Zelle or cash process.

Only provider-confirmed, mapped Square payments are calculated. Missing mappings create review exceptions instead of guessed amounts. Historical calculations are not silently rewritten; corrections are adjustments. Weekly statements are provisional reports and do not move money or run payroll.

## Protected background jobs

- Square webhook inbox: every 2 minutes.
- Notification delivery: every 5 minutes.
- Appointment reminders: every 15 minutes.
- Queue recovery: every 5 minutes.
- Commission reconciliation: every 15 minutes when live Square is enabled.

All processor routes require `CRON_SECRET`.

## Validation

Completed in the release environment:

- Formatting guard passed.
- Content validation passed: 31 services, 9 public barber profiles, 3 membership definitions.
- Migration validation passed: 10 ordered transactional migrations.
- RLS validation passed across 14 protected domains.
- Route validation passed: 166 page routes and 66 literal destinations.
- Repository validation passed: 383 source files.
- Vercel configuration validation passed.
- Performance validation passed.
- Secret scan passed.
- Unit tests passed: 40.
- Integration tests passed: 38.
- TypeScript syntax transpile passed: 397 files.

The isolated package mirror did not permit a clean dependency installation, so semantic TypeScript checking, ESLint, and the final Next.js production build must run in the normal local/Vercel environment using `npm ci --include=optional`, `npm run check:source`, and `npm run build`.

## Required production activation

1. Apply migration `202607310010_operational_queue_display.sql`.
2. Set `NEXT_PUBLIC_FEATURE_WALK_IN_QUEUE=true` and `NEXT_PUBLIC_FEATURE_KIOSK=true` in Vercel.
3. Redeploy without the old build cache.
4. Invite and link each real barber account.
5. Confirm each barber’s eligible services and availability.
6. Enter approved service prices, durations, deposits, and membership terms.
7. Connect and test production Square credentials, location, service catalog, team-member mappings, and webhook signature.
8. Enable Square-dependent flags only after booking, payment, refund, and webhook tests pass.
9. Add Twilio credentials and enable SMS only when the business has approved SMS consent and messaging practices.

No live credentials are included in the release.
