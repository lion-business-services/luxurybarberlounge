# Claude Code Repository Contract

## Product

Luxury Barber Lounge is a premium public website plus client, barber, reception, and owner workspaces. Preserve the existing brand system and never replace it with a generic template.

## Repository map

- `src/app` — public routes, portals, and API routes
- `src/components` — layout, marketing, motion, booking, queue, portal, and public UI
- `src/lib/content/site.ts` — canonical business and launch content
- `src/lib/booking` — provider-neutral booking contract and adapters
- `src/lib/attribution` — deterministic attribution logic
- `src/lib/commissions` — deterministic commission logic
- `src/lib/supabase` — browser/server clients and types
- `src/lib/square` — Square configuration, requests, and signature verification
- `src/lib/automation` — approved automation catalog
- `supabase/migrations` — ordered, non-destructive database changes
- `supabase/seed` — idempotent development seed
- `tests` — unit and repository integration tests
- `docs` — architecture, operations, setup, security, testing, and launch

## Protected product rules

1. Square is the intended source of truth for locations, catalog, team, bookings, customers, orders, payments, tips, deposits, and refunds.
2. Supabase stores extended profiles, content, attribution, commission, queue, communications, audit, and portal data.
3. Never store raw payment-card data.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `SQUARE_ACCESS_TOKEN`, webhook keys, provider keys, or auth tokens to a client bundle.
5. AI may explain approved records but may not decide attribution, commission, pricing, availability, refunds, permissions, or publication.
6. Historical settled calculations are corrected with adjustment rows, not silent rewrites.
7. Public users may never choose a staff role.
8. Public reviews must be genuine, verified, and approved for publication.
9. Demo availability, barbers, products, and memberships must remain clearly marked internally and must not be represented as live facts.
10. Do not alter the verified business phone, address, email, or domain outside `src/lib/content/site.ts`.

## Design rules

- Preserve near-black, ivory, champagne, brass, bronze, and oxblood tokens.
- Keep the official crest proportional and unboxed.
- Motion must support content and booking, not obstruct it.
- No blank hero, blocking intro, scroll hijacking, autoplay audio, touch cursor, inaccessible hover-only action, or unbounded animation loop.
- Respect reduced motion and constrained devices.
- Do not add a new animation library without removing duplication and documenting the reason.

## Code rules

- TypeScript strict mode stays enabled.
- Avoid `any`, `@ts-ignore`, broad ESLint suppressions, and client-side privileged operations.
- Keep business logic outside UI components.
- Validate untrusted input at server boundaries.
- Use feature flags for inactive integrations.
- Keep public error messages sanitized.
- Add tests for attribution, commission, validation, permissions, and provider behavior.
- Migrations must be ordered and additive; never use destructive shortcuts on unknown production data.

## Commands required before completion

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm test
npm run test:integration
npm run build
```

Do not claim production readiness while one of these gates fails. If a build is blocked by the execution environment rather than source code, report the exact external blocker and preserve all other passing results.
