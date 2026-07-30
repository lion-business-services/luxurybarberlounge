# Supabase Setup

This project uses Supabase Auth, Postgres, Storage, and Row Level Security. Production currently requires all ordered migrations 001 through 009.

## Required environment variables

Browser-safe:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Server-only:

```env
SUPABASE_SERVICE_ROLE_KEY=
INITIAL_OWNER_EMAIL=info@theluxurybarberlounge.com
CRON_SECRET=
```

Never place the service-role key or cron secret in a `NEXT_PUBLIC_` variable, browser code, screenshot, ticket, or repository file.

## Link and apply migrations

From the repository root:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npm run validate:migrations
npm run validate:rls
npx supabase@latest db push
npx supabase@latest migration list
```

Local and remote migration columns must match through:

- `202607280001_foundation.sql`
- `202607280002_catalog_bookings_queue.sql`
- `202607280003_content_memberships_engagement.sql`
- `202607280004_commissions_reconciliation.sql`
- `202607280005_crm_automation_integrations.sql`
- `202607280006_rls_storage.sql`
- `202607290007_policy_auth_operational_completion.sql`
- `202607300008_portal_separation_and_production_baseline.sql`
- `202607300009_portal_operations_privacy_and_history.sql`

Do not edit an already-applied production migration. Add a new forward migration for corrections.

## Production seed policy

Do not run `supabase db seed` against production. The seed is intended for controlled local or staging validation and may contain demonstration operational records. Production business, staff, barber, service, price, membership, and provider mappings must be entered deliberately.

## Generate database types

After the hosted schema is current, set `SUPABASE_PROJECT_REF` locally or pass it to the command, then run:

```bash
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF npm run types:supabase
npm run typecheck
```

Review generated changes before committing them. Never generate production types with a service-role key in a command line or log.

## Authentication configuration

In Supabase Authentication:

- Site URL: `https://www.theluxurybarberlounge.com`
- Redirects: approved production, bare-domain, local, and explicit Vercel Preview URLs
- Email provider: enabled
- Allow new users: enabled
- Confirm Email: disabled for the code-only OTP flow
- OTP expiry: 600 seconds
- Minimum resend interval: at least 60 seconds
- Magic Link/OTP template: include `{{ .Token }}` and remove `{{ .ConfirmationURL }}`

The application verifies the code server-side, creates or retrieves the profile, consumes an eligible staff invitation, resolves the active role, writes hashed session audit metadata, and redirects to the authorized portal.

## Initial owner

1. Set `INITIAL_OWNER_EMAIL=info@theluxurybarberlounge.com` in Vercel server environments.
2. Request and verify an OTP using the exact address.
3. The server assigns owner only to that authenticated Supabase user ID.
4. Confirm the owner record in `user_roles` and the login event in authentication audit records.
5. Confirm no other verified email receives owner automatically.

## Row Level Security

Static checks:

```bash
npm run validate:rls
npm run validate:migrations
```

Staging structural smoke test:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/portal_rls.sql
```

Then execute the live identity matrix in `docs/RLS_TESTING.md`. Do not use the service-role key to test client, barber, reception, or manager behavior because it bypasses RLS.

## Storage

Confirm private buckets, file-size limits, MIME restrictions, and storage policies after migrations. Client references, dispute evidence, and operational uploads must remain private and be served through short-lived signed URLs to authorized users.

## Resend and scheduled processing

Configure Resend custom SMTP using `docs/RESEND_OTP_SETUP.md`. After OTP and application email tests pass, configure an approved scheduler to call:

- `/api/cron/notifications`
- `/api/cron/webhooks`

Each request must send `Authorization: Bearer $CRON_SECRET`. Record cadence, owner, alerts, and rollback.

## Backups and recovery

Enable the appropriate backup or point-in-time recovery plan, document retention, and rehearse a restore into a non-production project. Preserve migrations, audit history, consent, locked calculations, statements, attribution decisions, disputes, and provider references.
