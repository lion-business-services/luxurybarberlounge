# Luxury Barber Lounge Portal and CRM Release

Release: `portal-crm-production-ready-v8`
Date: 2026-07-30

This source package preserves the approved public website and delivers separate authenticated applications for clients and business operations.

## Included

- Separate mobile-first client portal under `/client/**`
- Separate executive admin CRM under `/admin/**`
- Independent barber and reception route boundaries
- Six-digit Supabase OTP architecture through Resend
- Secure owner bootstrap, role precedence, staff invitations, and server authorization
- Nine ordered Supabase migrations with RLS, privacy, history, and operational extensions
- Client appointments, queue, orders, membership, profile, grooming, notifications, support, and privacy workflows
- Admin clients, barbers, orders, memberships, queue, attribution, commissions, statements, disputes, automations, integrations, users, audit, and security modules
- Deterministic queue assignment with reason, rule version, override, and audit
- Provider-gated Square, Resend, Twilio, and AI integrations
- Documentation, tests, validators, and release controls

## Validation

`npm run check:source` passes all source gates. The final measured counts are recorded in `docs/VALIDATION_REPORT.md`. A production build was attempted but could not begin source compilation because the isolated package mirror returned HTTP 404 for the required Linux Next.js SWC package. Vercel must perform a clean Linux install and build.

## Deployment

1. Preserve the existing `.git` folder and Vercel linkage.
2. Replace repository contents with this release.
3. Do not copy `node_modules`, `.next`, or a real `.env` file.
4. Run `npm ci --include=optional` and `npm run check` in clean Linux/Vercel Preview.
5. Apply migrations 001 through 009 and regenerate types.
6. Test client, barber, reception, manager, and owner identities separately.
7. Complete the Preview viewport, RLS, OTP, provider, security, and launch checklists.
8. Activate Square, SMS, automation schedules, membership billing, and AI only after their provider-specific tests pass.

Start with `README.md`, `docs/FINAL_RELEASE_REPORT.md`, `docs/DEPLOYMENT.md`, and `docs/LAUNCH_CHECKLIST.md`.
