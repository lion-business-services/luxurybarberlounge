# Luxury Barber Lounge

Production-oriented Next.js website and role-aware operating-platform foundation for **Luxury Barber Lounge**, 801 Tilton Road, Suite 106, Northfield, New Jersey.

The repository preserves the existing cinematic black, ivory, brass, bronze, and oxblood visual system while completing the public information architecture, bilingual content, service catalog, booking and queue development providers, portal interfaces, deterministic attribution and commission logic, Supabase migrations, RLS, provider abstractions, tests, and deployment documentation.

## What is included

### Public experience

- Cinematic, immediately visible scroll-to-discover homepage
- Services catalog and dynamic service pages
- Barber directory and nine dynamic, responsive barber profiles using the owner-supplied team portraits
- Booking request experience with provider abstraction
- Honest walk-in/queue states and kiosk interfaces
- Memberships, packages, gift cards, gallery, reviews, events, weddings, products, careers, FAQ, journal, policies, contact, and Visit pages
- English and Spanish content support
- Local SEO metadata, sitemap, robots, structured data, Open Graph assets, accessibility states, and reduced-motion behavior

### Role-aware workspaces

- A dedicated mobile-first client application with appointments, queue, orders, membership, profile, notifications, support, and privacy workflows
- Barber portal
- Reception portal
- A separate executive owner/manager CRM with operations, clients, barbers, memberships, automations, analytics, and owner-only governance
- Conservative production portal gate with opt-in demo mode

### Business platform foundation

- Supabase browser and server clients
- Nine ordered, transactional Postgres migrations
- Role and permission model
- Row Level Security policies
- Storage buckets and policies
- Seed data for the verified business, 31 services, the nine-profile roster with temporary fields explicitly marked, memberships, templates, and feature flags
- Square booking provider abstraction and verified-webhook inbox
- Development booking provider for credential-free testing
- Deterministic attribution and commission engines
- CRM, automation, notification, audit, reconciliation, dispute, and queue schemas
- Development email, SMS, and AI adapters
- Integration-health endpoints

## Technology

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Motion for React
- Lenis with reduced-motion and device guardrails
- Supabase Postgres/Auth/Storage architecture
- Square server-side adapter architecture
- Node test runner for deterministic business logic

## Requirements

- Node.js 22.x, matching `package.json`, `.nvmrc`, GitHub Actions, and Vercel configuration.
- npm 10 or later
- A clean dependency installation. Do not reuse a `node_modules` folder copied from another operating system.

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

Credential-dependent features remain in safe development mode until their flags and provider credentials are configured. The public website does not require Square, Supabase, email, SMS, or AI credentials to render.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm test
npm run test:integration
npm run build
```

Run every source-level gate without invoking the platform compiler:

```bash
npm run check:source
```

Run the complete release gate, including the production build, in a clean environment:

```bash
npm run check
```

## Supabase

Migrations are stored in `supabase/migrations` and must be applied in timestamp order. Seed data is in `supabase/seed/seed.sql`.

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
# Do not run db seed against production. The seed is for controlled development only.
```

Review `docs/SUPABASE_SETUP.md`, `docs/AUTH_ARCHITECTURE.md`, `docs/RLS_TESTING.md`, and `docs/ROLES_AND_PERMISSIONS.md` before applying changes to a production project.

## Feature flags

The default public build is deliberately honest:

- Membership comparison is visible, but billing is disabled.
- Walk-in queue and kiosk are disabled until operations are ready.
- Square live booking is disabled until catalog and team mappings are verified.
- Product commerce and gift-card purchase are disabled until Square commerce is activated.
- AI concierge uses approved deterministic content when no provider is configured.
- Staff portals are closed in production unless a server session exists; seeded portal demos require explicit `NEXT_PUBLIC_PORTAL_DEMO_MODE=true`.

See `.env.example`, `docs/ENVIRONMENT_VARIABLES.md`, and `docs/LAUNCH_CHECKLIST.md`.

## Canonical business content

Public business information comes from `src/lib/content/site.ts` so the footer, Visit page, mobile actions, metadata, structured data, emails, and portal interfaces cannot drift apart.

Confirmed values:

- Luxury Barber Lounge
- 801 Tilton Road, Suite 106, Northfield, NJ 08225
- (609) 384-5171
- info@theluxurybarberlounge.com
- https://www.theluxurybarberlounge.com

Hours, service prices, deposits, memberships, policy terms, accessibility details, and barber biographies remain owner-confirmation fields and are listed in `docs/launch/content-replacement.md`.

## Deployment

The project is Vercel-compatible and does not require committed secrets.

1. Push the repository to GitHub.
2. Import or use the existing Vercel project.
3. Set environment variables from `.env.example`.
4. Leave credential-dependent feature flags disabled until their activation checklists pass.
5. Deploy a Preview.
6. Run the QA and production launch checklists.
7. Promote only after `npm run check` succeeds in a clean Linux environment.

See `docs/DEPLOYMENT.md` and `docs/LAUNCH_CHECKLIST.md`.

## Documentation map

- `docs/FINAL_RELEASE_REPORT.md` and `docs/VALIDATION_REPORT.md` - final release scope and measured validation results

- `docs/ARCHITECTURE.md` — application and provider boundaries
- `docs/LOCAL_SETUP.md` and `docs/ENVIRONMENT_VARIABLES.md` — local environment
- `docs/SUPABASE_SETUP.md` and `docs/RESEND_OTP_SETUP.md` — passwordless authentication and data setup
- `docs/SQUARE_SETUP.md` — sandbox, production, mappings, and webhooks
- `docs/AUTHENTICATION.md`, `docs/AUTH_ARCHITECTURE.md`, `docs/OWNER_SETUP.md`, and `docs/ROLES_AND_PERMISSIONS.md` — sessions and access model
- `docs/CLIENT_PORTAL.md`, `docs/CLIENT_PROFILES.md`, `BARBER_PORTAL.md`, `RECEPTION_PORTAL.md`, and `ADMIN_CRM.md` — workspace behavior
- `docs/QUEUE_SYSTEM.md`, `docs/QUEUE_AND_ASSIGNMENT.md`, `ATTRIBUTION.md`, `docs/ATTRIBUTION_AND_COMMISSIONS.md`, `COMMISSION_POLICY_SETUP.md`, and `STATEMENTS_AND_DISPUTES.md` — operating systems
- `docs/OWNER_OPEN_DECISIONS.md` — values that remain intentionally inactive
- `docs/MOTION_AND_RESPONSIVENESS.md` and `docs/PERFORMANCE_AUDIT.md` — cross-device cinematic delivery
- `docs/SECURITY.md`, `ACCESSIBILITY.md`, `TESTING.md`, `docs/RLS_TESTING.md`, and `docs/PORTAL_QA.md` — release controls
- `docs/DEPLOYMENT.md`, `LAUNCH_CHECKLIST.md`, and `TROUBLESHOOTING.md` — release and operations

## Important operational boundary

The commission and reconciliation modules calculate and report amounts. They do not transfer funds or represent payroll software. Square remains the operational and financial source of truth when connected. Proposed/open policy terms remain disabled until the owner approves a future effective-dated policy version.

## Vercel deployment

Use [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md) for the deployment-safe configuration, required project settings, and the later cron activation procedure.

## Production appointment booking

The stable customer booking route is [`/book`](https://theluxurybarberlounge.com/book). It uses Supabase-backed live services, verified barber eligibility, schedules, breaks, time off, conflict-safe appointment creation, client matching, queue integration, FormSubmit administrative delivery, and Resend transactional notifications.

Key documentation:

- `docs/BOOKING_SYSTEM.md`
- `docs/BOOKING_FLOW.md`
- `docs/BOOKING_DATA_MODEL.md`
- `docs/AVAILABILITY_ENGINE.md`
- `docs/FORMSUBMIT_SETUP.md`
- `docs/FORMSUBMIT_ACTIVATION.md`
- `docs/ADMIN_APPOINTMENTS.md`
- `docs/CLIENT_APPOINTMENTS.md`
- `docs/BOOKING_QA.md`
- `docs/LAUNCH_CHECKLIST.md`

Apply migrations through `202608060015`, regenerate Supabase types, configure the values in `.env.example`, and run `npm run check:source && npm run build` before production promotion.

## Production booking release v11

The complete release and validation boundaries are documented in:

- `docs/BOOKING_RELEASE_REPORT.md`
- `docs/BOOKING_VALIDATION_REPORT.md`
- `docs/BOOKING_SYSTEM.md`
- `docs/FORMSUBMIT_ACTIVATION.md`
- `docs/LAUNCH_CHECKLIST.md`
