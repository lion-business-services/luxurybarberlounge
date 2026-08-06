# Booking Validation Report

Release: `production-booking-final-v11`
Validation date: 2026-08-06

## Passed repository gates

- Format guard: passed.
- Content validation: passed, 31 services, 9 source barber profiles, 3 membership definitions.
- Migration validation: passed, 14 ordered transactional migrations.
- RLS validation: passed across 14 migrations and 14 protected domains.
- Route validation: passed, 167 page routes and 66 literal internal destinations.
- Repository validation: passed, 167 pages, 14 migrations, 403 source files.
- Vercel configuration validation: passed.
- Performance architecture validation: passed, one Lenis owner and no GSAP overlap.
- Secret scan: passed.
- Unit tests: 40 passed, 0 failed.
- Integration tests: 52 passed, 0 failed.
- TypeScript syntax transpile: 418 non-declaration TypeScript files, 0 syntax errors.

## Dependency, lint, type-check, and build boundary

A clean dependency installation was attempted with:

```bash
npm ci --include=optional
```

The isolated package mirror returned HTTP 404 for:

```text
zod-validation-error-4.0.2.tgz
```

Because `node_modules` could not be installed in this environment:

- `npm run lint` could not run because `eslint` was unavailable.
- `npm run typecheck` could not perform a meaningful semantic check because Next.js, React, Supabase, and declaration dependencies were unavailable.
- `npm run build` could not run because the `next` binary was unavailable.

This report does not claim those three gates passed. The required deployment-environment commands are:

```bash
npm ci --include=optional
npm run check:source
npm run build
```

## Browser and provider QA boundary

Rendered browser testing, Safari testing, mobile-device testing, live FormSubmit activation, live Resend delivery, production Square synchronization, Twilio delivery, and live RLS identity smoke tests require the owner's external projects and a deployable runtime. Static route, accessibility architecture, responsive CSS, security, RLS, conflict, idempotency, notification, queue, admin, and client integration tests passed.
