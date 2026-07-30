# Validation Report

Release date: 2026-07-30
Release: `portal-crm-production-ready-v8`

## Source release gates

`npm run check:source` completed successfully in the final portal and CRM workspace after the client/admin separation, operational APIs, migration additions, accessible decision forms, and documentation updates.

- Format guard: passed
- ESLint: passed with zero errors and zero warnings
- TypeScript strict check: passed
- Content validation: passed, 31 services, 9 barber profiles, 3 membership concepts
- Migration validation: passed, 9 ordered transactional migrations
- RLS validation: passed across 9 migrations and 14 protected domains
- Route validation: passed, 165 page routes and 64 literal internal destinations
- Repository validation: passed, 370 source files
- Vercel configuration validation: passed
- Performance architecture validation: passed, one Lenis owner and no GSAP overlap
- Secret scan: passed
- Unit tests: 40 passed, 0 failed
- Integration tests: 27 passed, 0 failed
- Native browser prompts in portal actions: removed

## Production build

Command attempted:

```bash
npm run build
```

Next.js could not begin application compilation in the isolated validation environment. The copied dependency tree did not contain a Linux native SWC binary, and the internal package mirror returned HTTP 404 while Next.js attempted to download its fallback compiler:

```text
@next/swc-wasm-nodejs@16.2.6
https://packages.applied-caas-gateway1.internal.api.openai.org/.../swc-wasm-nodejs-16.2.6.tgz
HTTP 404

Attempted native packages:
@next/swc-linux-x64-gnu
@next/swc-linux-x64-musl
```

This report does not claim that the production build passed. The lockfile contains the Linux native optional dependency. Vercel or another clean Linux environment must run:

```bash
npm ci --include=optional
npm run check
```

## Browser and live-provider boundary

The local Next.js server could not start without SWC, so rendered-browser screenshots, Playwright, Safari, and Lighthouse results were not fabricated. The final Vercel Preview must complete the viewport and role matrix in `docs/PORTAL_QA.md`.

Live OTP delivery, live RLS identity testing, Resend application delivery, Square sandbox synchronization, SMS, cron scheduling, and optional AI-provider tests require the owner's external projects and secrets. Static authorization, route separation, migration, RLS, provider guard, queue, commission, audit, repository, unit, and integration tests passed.
