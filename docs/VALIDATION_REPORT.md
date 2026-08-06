# Validation Report

Current release: `ruben-live-booking-v11.4` (2026-08-06)

Passed:

- Format guard
- Content validation: 9 services, 9 active barbers, 2 memberships, 3 packages
- Migration validation: 17 ordered transactional SQL files
- Static RLS validation: 17 migrations and 14 protected domains
- Route validation: 167 page routes and 66 literal internal destinations
- Repository validation: 404 source files
- Vercel configuration validation
- Performance source validation
- Secret scan
- Unit tests: 42 passed
- Integration tests: 59 passed
- TypeScript syntax transpile: 420 source files, zero syntax errors
- Visual inspection of the nine-person portrait contact sheet

Not completed here:

- Lint
- Semantic TypeScript check
- Production build
- Live Supabase migration/RLS verification
- Live FormSubmit, Resend, Square, Realtime, and cron verification
- Rendered browser/device and aXe validation

Dependency installation was blocked by missing packages in the execution environment's internal npm mirror. See `docs/FINAL_RELEASE_REPORT.md`.
