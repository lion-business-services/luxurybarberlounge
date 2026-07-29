# Supabase Setup

This project uses Supabase Auth, Postgres, Storage, and RLS. The implementation follows the current official Supabase Next.js SSR, passwordless email, SMTP, email-template, and RLS guidance:

- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/database/postgres/row-level-security

Dashboard labels can change, so verify them against these official pages before production activation.

## 1. Create and record the project

1. Create the production Supabase project in the correct organization and region.
2. Set a strong database password and store it in the company password manager.
3. Record the Project URL and anonymous key for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Record the service-role key only in the password manager and Vercel server environment as `SUPABASE_SERVICE_ROLE_KEY`.
5. Never paste the service-role key into browser code, screenshots, tickets, or public logs.

## 2. Link and apply migrations

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The transactional SQL files in `supabase/migrations` must run in timestamp order. Review the output and do not edit an already-applied production migration. Add a new migration for corrections.

For a clean non-production test:

```bash
supabase db reset
```

## 3. Seed and type generation

Use the supplied seed only in a development or approved staging environment:

```bash
supabase db seed
```

Generate current types after migrations:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > src/lib/supabase/generated.types.ts
```

Commit generated type changes only after reviewing them.

## 4. Storage

The migrations create or reference private buckets for evidence and operational uploads. Confirm buckets and storage policies in the dashboard. Private attribution evidence must be served only through short-lived signed URLs to authorized users. Do not make evidence or client inspiration uploads public.

## 5. Auth URL configuration

In Auth URL configuration:

- Site URL: `https://www.theluxurybarberlounge.com`
- Add local redirect: `http://localhost:3000/**`
- Add Vercel preview patterns deliberately, or list approved preview URLs.
- Add production callback URLs only for domains controlled by the business.

The application verifies six-digit email OTPs through server route handlers and then stores secure HttpOnly session cookies.

## 6. Passwordless email OTP

In Auth provider settings, keep email enabled. Configure email OTP rather than a password-first public flow. The client submits an email, Supabase generates the token, the custom email template displays `{{ .Token }}`, and `/api/auth/verify-otp` calls `verifyOtp` server-side.

Set an expiration appropriate for privileged access. The UI handles invalid, expired, rate-limited, resend, and delivery-failure states without exposing whether an account existed before verification.

## 7. Resend custom SMTP

Configure Supabase Auth custom SMTP using the verified Resend domain. Follow `docs/RESEND_OTP_SETUP.md`. Test both HTML and plain-text delivery before production.

## 8. Initial owner

1. Set `INITIAL_OWNER_EMAIL=info@theluxurybarberlounge.com` in Vercel server environments.
2. Apply migrations and confirm the owner role exists.
3. Request and successfully verify an OTP for the exact email.
4. The server bootstrap assigns the owner role only after Supabase has verified the address.
5. Confirm `user_roles` and `auth_audit` records.
6. Remove or retain `INITIAL_OWNER_EMAIL` according to the company’s documented bootstrap policy. It is safe only because the role is assigned after ownership of the email is proven.

Never grant owner access from a client-side email comparison.

## 9. Staff invitations and role testing

Owner or authorized manager creates staff invitations and server-side role records. Staff use the same OTP login. Test every role in a separate browser profile:

- client cannot read other clients
- barber cannot alter attribution or locked calculations
- reception cannot access owner-only policy or finance settings
- manager is limited to authorized business/location scope
- owner can administer the business

## 10. RLS verification

RLS is not replaced by hidden navigation. Test with the anonymous key and real user sessions. Attempt prohibited reads and writes directly through the Supabase client and confirm Postgres rejects them. Validate private storage and signed URLs.

## 11. Backups and recovery

Enable the project’s appropriate backup/PITR plan, record recovery ownership, and rehearse a restore into a non-production project. Preserve migrations, statements, audit records, policy versions, and evidence according to approved retention rules.

## 12. Troubleshooting

- `AUTH_NOT_CONFIGURED`: public URL or anonymous key is missing.
- OTP mail absent: check Supabase Auth logs, SMTP sender/domain verification, template token, rate limits, and spam placement.
- Logged in but redirected: inspect `user_roles`, active-role cookie, and portal layout authorization.
- Empty data: confirm migrations, RLS, business scope, and seed environment.
- Never “fix” an RLS error by moving the service-role key into the browser.
