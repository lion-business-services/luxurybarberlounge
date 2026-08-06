# Production Booking Release Report

Release: `production-booking-final-v11`
Date: 2026-08-06
Business: Luxury Barber Lounge
Canonical route: `/book`
Operational source of truth: Supabase until Square Bookings production credentials and mappings are approved.

## Problems corrected

The inherited repository contained a polished public experience and substantial operating-platform groundwork, but booking remained split across legacy metadata, provider adapters, incomplete availability surfaces, and notification concepts. It did not yet provide one atomic public booking transaction with durable idempotency, conflict prevention, a secure guest-management token, FormSubmit delivery tracking, or a complete appointment-management workspace.

## Final architecture

- Lightweight mobile-first booking route at `/book`.
- Typed business configuration in `src/lib/config/business.ts`.
- Typed booking domain in `src/lib/booking`.
- Real service, barber, schedule, break, time-off, holiday, appointment, and hold data from Supabase.
- Atomic PostgreSQL appointment creation and rescheduling.
- Database exclusion constraints plus advisory locks for concurrency safety.
- Durable idempotency and rate limiting.
- Administrative FormSubmit notifications that never control booking success.
- Resend-compatible client, staff, and fallback administrative notifications.
- Admin appointment operations under `/admin/appointments`.
- Client-owned appointment history and actions under `/client`.
- Privacy-safe in-shop queue board at `/queue-board`.
- Provider-neutral Square adapter boundary for later production activation.

## Operational behavior

A public submission is validated, rate-limited, rechecked against current server availability, matched to a controlled client record, and committed through `create_appointment_atomic`. The appointment, assignment, status history, audit record, add-ons, consent, FormSubmit delivery record, and notification jobs are persisted before the client receives a successful confirmation response.

FormSubmit or Resend failure cannot delete or invalidate a successfully reserved appointment. Delivery failures are recorded and retried by protected cron processors.

## Live-provider boundary

The repository contains the production implementation and activation documentation, but this isolated build environment did not possess the owner's live Supabase, Resend, FormSubmit inbox, Square, Twilio, or Vercel credentials. Therefore:

- FormSubmit recipient activation is **not claimed as verified**.
- Live administrative FormSubmit delivery is **not claimed as verified**.
- Live Resend client/staff delivery is **not claimed as verified**.
- Square remains optional and disabled until production mappings are validated.
- New migrations must still be pushed to the linked production project.

## Go-live gates

1. Apply migrations through `202608060014_booking_abuse_protection.sql`.
2. Regenerate hosted Supabase types with `npm run types:supabase`.
3. Configure the environment variables listed in `.env.example`.
4. Complete the controlled FormSubmit activation submission and inbox approval.
5. Verify Resend delivery and reply-to behavior.
6. Create real active barber records, service eligibility, and schedules.
7. Confirm service prices, durations, buffers, holidays, and cancellation policy.
8. Run `npm ci --include=optional`, `npm run check:source`, and `npm run build` in the deployment environment.
9. Complete the browser/device matrix in `docs/BOOKING_QA.md`.
10. Deploy and perform the production smoke test in `docs/LAUNCH_CHECKLIST.md`.
