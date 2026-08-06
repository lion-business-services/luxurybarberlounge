# Luxury Barber Lounge

Production-oriented Next.js 16 website and role-aware operating platform for **Luxury Barber Lounge**, 801 Tilton Road, Suite 106, Northfield, New Jersey.

The approved cinematic black, charcoal, ivory, brass, and bronze public design is preserved. Client-confirmed hours, services, prices, deposits, age rules, barber identities, memberships, packages, vouchers, booking rules, queue behavior, and portal workflows are centralized and protected from drift.

## Final client content

The public roster contains eight mapped barber profiles, with the original photograph-to-person relationship preserved:

1. Angelica Aquino
2. Hommy Rivera
3. Barber Lo's
4. Jose
5. Elvis
6. Alfredo Hernandez (Pollo)
7. Russ Hawkins
8. Daniel Penalo

Rubén Díaz, Jr. remains a separate founder profile and is not seeded as an active booking provider.

The active service catalog contains nine client-confirmed services. Every booking deposit is 50% of the service total. Color is explicitly unavailable. The two memberships, three packages, and gift cards starting at $50 are defined in `src/lib/content/site.ts` and mirrored by the final Supabase migration and development seed.

See:

- `docs/FINAL_CLIENT_CONTENT.md`
- `docs/BARBER_DATA_MAPPING.md`
- `docs/BARBER_IMAGE_FRAMING.md`
- `docs/BUSINESS_HOURS.md`
- `docs/SERVICES_AND_PRICING.md`
- `docs/MEMBERSHIPS_AND_PACKAGES.md`

## Operating platform

The repository includes:

- A multi-step `/book` experience using live catalog and availability endpoints
- Server-side availability calculation with schedules, breaks, time off, existing appointments, temporary holds, lead time, booking window, service duration, and buffers
- Atomic Supabase appointment creation with overlap constraints, advisory locking, idempotency, service snapshots, public references, audit history, and secure guest-management tokens
- Admin appointments workspace, client appointments, barber schedule views, reception queue, kiosk flow, and privacy-safe shop queue display
- FormSubmit administrative notification and Resend transactional-email paths with independent delivery logs and retries
- Real-time operational data paths using Supabase Realtime where configured
- Role-aware server authorization and Row Level Security policies
- Square provider abstraction that remains disabled until credentials, location, catalog, and team-member mappings are verified

## Technology

- Node.js 22.x
- Next.js 16 App Router
- React 19
- Strict TypeScript
- Tailwind CSS 4
- Motion for React and Lenis with reduced-motion/device guardrails
- Supabase Postgres, Auth, Realtime, and Storage architecture
- Square server-side adapter architecture
- Node test runner for deterministic source, unit, and integration checks

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `SQUARE_ACCESS_TOKEN`, webhook signatures, Resend keys, FormSubmit activation details, cron secrets, or guest-management secrets to browser code.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm run validate:migrations
npm run validate:rls
npm run validate:routes
npm run validate:repository
npm run validate:vercel
npm run validate:performance
npm run scan:secrets
npm test
npm run test:integration
npm run build
```

`npm run check` executes the complete release gate. A production claim is valid only after these commands run in a clean Node 22 environment with dependencies successfully installed.

## Supabase order

Apply migrations in timestamp order through:

```text
supabase/migrations/202608060016_final_client_content_release.sql
```

The final migration replaces the provisional launch snapshot with the client-confirmed roster, exact hours, exact catalog, eligibility, confirmed schedules, membership versions, packages, voucher configuration, and barber intake settings. The development seed is in `supabase/seed/seed.sql` and must not be run against production.

## Credential-dependent activation

Keep provider flags disabled until each integration passes its checklist:

- Supabase project URL, anon key, and server-only service-role key
- `BOOKING_MANAGE_SECRET`
- FormSubmit recipient activation for `info@theluxurybarberlounge.com`
- Resend API key and verified sending domain/address
- Square environment, application ID, access token, location ID, webhook signature key, catalog mappings, and team-member mappings
- Cron secret and hosting cron schedules
- Optional SMS provider values

See `docs/OWNER_CONFIRMATIONS_REQUIRED.md`, `docs/LAUNCH_CHECKLIST.md`, and `.env.example`.

## Documentation map

The final implementation documentation is in `docs/`, including booking, availability, admin, client, barber, queue, automations, email, Supabase, Resend, FormSubmit, Square, security, RLS, portal QA, deployment, launch, and troubleshooting guides. `docs/FINAL_RELEASE_REPORT.md` records the release result and any validation blocked by the execution environment.
