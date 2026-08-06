# Booking Validation Report

Current release: `ruben-live-booking-v11.4` (2026-08-06)

Passed in the isolated release environment:

- public anonymous catalog RPC and service-role-independent normal catalog reads
- exact service catalog, prices, durations, and 50% deposits
- nine-person active barber roster, including Rubén Diaz, Jr.
- Ruben owner/barber role separation and no invented schedule
- responsive AVIF, WebP, and JPEG portrait assets for all nine barbers
- real scheduled-provider filtering, server-side availability, atomic booking, conflict controls, portals, queue, notifications, and privacy-safe display paths
- 42 unit tests and 59 integration tests
- 17 ordered transactional migrations and static RLS coverage across 14 protected domains
- format, content, route, repository, Vercel, performance, and secret validation
- TypeScript syntax transpile: 420 files, zero syntax errors

Not completed in this environment:

- live production Supabase migration and RLS execution
- live FormSubmit, Resend, Square, Realtime, and cron delivery
- dependency-backed lint and semantic type checking
- Next.js production build
- rendered browser, device, and aXe testing

The dependency-backed gates were blocked by the execution environment's npm mirror, which returned HTTP 404 for `zod-validation-error-4.0.2.tgz` and `zod-4.4.3.tgz`. See `docs/FINAL_RELEASE_REPORT.md`.
