# Validation Report

Current release: `final-client-content-booking-v11.3` (2026-08-06)

Passed in the isolated release environment:

- Format guard
- Client-content validation: 9 services, 8 active barbers, 2 memberships, 3 packages
- Migration validation: 16 ordered transactional SQL files
- Static RLS validation: 16 migrations and 14 protected domains
- Route validation: 167 page routes and 66 literal internal destinations
- Repository validation: 404 source files
- Vercel configuration validation
- Performance source validation
- Secret scan
- Unit tests: 42 passed
- Integration tests: 56 passed
- TypeScript syntax transpile: 419 source files, zero syntax errors

Not completed in this environment:

- Lint
- Semantic TypeScript check
- Production build
- Live Supabase migration/RLS verification
- Live FormSubmit, Resend, Square, realtime, and cron verification
- Rendered browser/device and aXe validation

The dependency gates were blocked because `npm ci --include=optional` received HTTP 404 from the execution environment package mirror for `zod-validation-error-4.0.2.tgz`. See `docs/FINAL_RELEASE_REPORT.md`.
