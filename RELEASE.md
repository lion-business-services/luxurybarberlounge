# Luxury Barber Lounge Production Source Release

Release: `vercel-ready-v7.1`
Date: 2026-07-29

This source package preserves the approved luxury website and adds the completed responsive, authentication, portal, queue, attribution, commission, policy-governance, webhook, automation, security, and documentation foundations requested for controlled production activation.

## Included

- Responsive cinematic hero with mobile video parity and safe-area composition
- Real barber team directly after the hero
- One strategic homepage service row
- Our Story founder page
- Passwordless Supabase email OTP architecture
- Secure owner bootstrap and owner-controlled staff invitations
- Client, Independent Barber, reception, manager, and owner portal routes
- Deterministic queue and Who's Next engine
- Versioned attribution and commission engines
- Immutable calculation and statement safeguards
- Policy approval, open-decision, acknowledgement, dispute, and Adjustment workflows
- Verified Square webhook inbox, canonical synchronization handlers, retry, and dead-letter recovery
- Resend, SMS, and AI provider abstractions behind feature flags
- Seven ordered Supabase migrations with RLS and storage policies
- Complete setup, security, operations, content, and launch documentation

## Validation

`npm run check:source` passed all source gates, including zero-warning lint, 36 unit tests, and 16 integration tests. Vercel-specific deployment blockers and the exact local production-build boundary are recorded in `docs/VERCEL_RELEASE_VALIDATION.md`.

## Deployment

1. Preserve the existing `.git` directory and Vercel project linkage.
2. Replace the repository contents with this release.
3. Do not copy `node_modules` from another computer.
4. Run `npm ci --include=optional` on the target Linux environment.
5. Run `npm run check`.
6. Review the Vercel Preview at the required desktop, laptop, tablet, and mobile widths.
7. Keep credential-dependent feature flags disabled until the corresponding setup checklist passes.
8. Apply Supabase migrations, configure Resend SMTP, and validate Square sandbox before production activation.

Start with `README.md`, `docs/DEPLOYMENT.md`, and `docs/LAUNCH_CHECKLIST.md`.
