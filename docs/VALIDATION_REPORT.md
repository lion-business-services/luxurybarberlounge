# Validation Report

Release date: 2026-07-29

## Source quality gates

The following command completed successfully in the Vercel-hardened release workspace:

```bash
npm run check:source
```

Results:

- Format guard: passed
- ESLint: passed with zero errors and zero warnings
- TypeScript strict check: passed
- Content validation: passed, 31 services, 9 barber profiles, 3 membership concepts
- Migration validation: passed, 7 ordered transactional migrations
- Route validation: passed, 147 page routes and 41 literal internal destinations
- Repository validation: passed, 288 source files at validation time
- Performance architecture validation: passed, one Lenis owner and no GSAP property overlap
- Secret scan: passed
- Unit tests: 36 passed, 0 failed
- Integration tests: 16 passed, 0 failed
- Vercel configuration validation: passed, with unsupported integration crons disabled

## Production build

Command attempted:

```bash
npm run build
```

The command was blocked before application compilation because the isolated validation environment could not retrieve the Linux Next.js compiler package:

```text
@next/swc-wasm-nodejs@16.2.6
HTTP 404 from packages.applied-caas-gateway1.internal.api.openai.org
Failed to load SWC binary for linux/x64
```

The package lock contains the official optional Linux package entry for `@next/swc-linux-x64-gnu@16.2.6`. The release archive excludes copied Windows `node_modules`, so the deployment environment must perform a clean `npm ci`.

This report does not claim that the production build passed. The failure occurred before source compilation and is separated from the passing source gates above.

## Browser validation boundary

The local Next.js server could not start without the Linux SWC binary, so live Playwright, Safari, and Lighthouse runs were not fabricated. Responsive behavior is protected by source-level integration tests, mobile-specific media, safe-area layout rules, reduced-motion behavior, and the centralized device capability engine. A Vercel Preview must complete the final rendered-browser matrix before production promotion.

## Credential-dependent validation

The following require the owner's external accounts and are intentionally not represented as live:

- Supabase project, migrations, generated production types, and RLS database tests
- Resend-verified domain and custom SMTP delivery
- Square sandbox credentials, mappings, and webhook test events
- Twilio SMS credentials
- Optional AI provider credentials

Exact activation and test instructions are under `docs/`.
