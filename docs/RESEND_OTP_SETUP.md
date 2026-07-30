# Resend OTP Setup

Use Resend as the verified SMTP provider for Supabase Auth OTP email. Use only current official documentation:

- https://resend.com/docs/send-with-supabase-smtp
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/api-keys/introduction
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates

## Domain and DNS

1. Create the Resend account under a company-controlled identity.
2. Add `theluxurybarberlounge.com` in Resend Domains.
3. Add every DNS record Resend displays at the authoritative DNS host.
4. Do not alter record values, proxy SMTP-related records, or reuse an unverified From domain.
5. Wait for Resend to report the domain verified.
6. Confirm SPF/DKIM results and monitor DMARC alignment.

## API key for application email

Create a restricted API key for the application notification provider. Store it as `RESEND_API_KEY` in Vercel. Configure `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO_EMAIL`. This key is separate from the SMTP credential configured in Supabase.

## Connect Resend to Supabase Auth

1. Open Supabase Auth SMTP settings.
2. Enable custom SMTP.
3. Enter the current SMTP host, port, username, and password shown by Resend’s official Supabase SMTP guide.
4. Set the sender name to Luxury Barber Lounge.
5. Use a verified sender such as `access@theluxurybarberlounge.com`.
6. Save and send a test only after the domain is verified.

Do not copy static SMTP values from old articles. Resend and Supabase dashboards can change them.

## Code-only signup and login

The website uses `signInWithOtp`, so the Supabase project must use the OTP flow for both new and returning users. In the hosted Supabase dashboard:

1. Open **Authentication → Sign In / Providers → Email**.
2. Keep **Allow new users to sign up** enabled.
3. Turn **Confirm Email** off. The six-digit OTP itself proves control of the email address, so a separate confirmation email is not required.
4. Open **Authentication → Email Templates → Magic Link or OTP**.
5. Use `{{ .Token }}` and remove `{{ .ConfirmationURL }}` from that template.
6. Keep the OTP length at six digits, expiry at 600 seconds, and minimum resend interval at 60 seconds.

If Confirm Email remains enabled, a newly created user can receive the separate “Confirm your email address” signup template before the OTP flow.

## Six-digit template

Configure the magic-link/OTP email template to display `{{ .Token }}` prominently. Include:

- official logo hosted on the production HTTPS domain
- “Your secure access code” heading
- six-digit token
- expiration warning
- “We will never ask you to forward this code” warning
- business phone and reply-to email
- plain-text equivalent

Do not include marketing offers in an authentication email.

## Required tests

- valid client OTP
- valid owner OTP
- invalid token
- expired token
- resend countdown
- request throttling
- verification-attempt throttling
- mobile email rendering
- plain-text rendering
- Gmail, Outlook, and Apple Mail placement where available
- local, Vercel Preview, and production redirects
- delivery failure and retry

## Security and rotation

Store credentials only in Supabase/Vercel secret stores and the company password manager. Rotate exposed keys immediately, then update environments and retest. Review Resend delivery logs and Supabase Auth logs without logging tokens in application output.
