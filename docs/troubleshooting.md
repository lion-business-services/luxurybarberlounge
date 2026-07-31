# Troubleshooting

## Client and admin portals look identical

Confirm the current release is deployed and that `/client` and `/admin` use their dedicated layouts, shells, data loaders, and CSS modules. Check `user_roles` and the active-role cookie. `selectPrimaryRole()` must resolve owner before client. Never fix this through CSS hiding.

## Verified owner is redirected to `/client`

- Confirm `INITIAL_OWNER_EMAIL` matches the verified address exactly.
- Confirm the user has an active owner record in `user_roles` for the correct business.
- Confirm account status is active.
- Clear stale session cookies by logging out, then verify a new OTP.
- Inspect sanitized auth audit events and server logs without exposing tokens.

## Client can reach an admin URL

Treat this as a security incident. Confirm the admin layout calls `requirePortalAccess`, nested owner-only layouts are present, RLS is enabled, and the browser is not running with the service-role key. Run the authorization and RLS test matrix before restoring access.

## OTP sends a confirmation link instead of a code

In Supabase Email provider settings, keep signup enabled and disable Confirm Email. In the Magic Link/OTP template, include `{{ .Token }}` and remove `{{ .ConfirmationURL }}`. Confirm Resend custom SMTP is saved and the verified sender domain is used.

## OTP does not arrive

Check Supabase Auth logs, Resend delivery logs, verified sender domain, custom SMTP username/password, sender address, template token, rate limits, spam placement, and email-provider status. The application intentionally returns a generic response.

## Resend appears configured but application email fails

Confirm both `RESEND_API_KEY` and the compatibility `EMAIL_PROVIDER_API_KEY` are set in the active Vercel environment, `EMAIL_PROVIDER=resend`, the From domain is verified, and a new deployment was created after variable changes. Review delivery failure records without displaying the API key.

## Portal data is empty

- Confirm migrations 001 through 009 are applied.
- Confirm the current user has the expected profile, role, business, and client/staff record.
- Confirm provider mappings exist when the screen depends on Square.
- Confirm RLS permits the current identity and business scope.
- Confirm the feature is not intentionally disabled.
- Do not insert fake production data to make a dashboard look populated.

## Membership request stays pending

This is intentional until the provider confirms the billing or subscription action and an authorized owner completes the request. The application must not represent a request as an active membership.

## Appointment cancellation or reschedule is rejected

Confirm Square/live booking credentials and mappings are configured, the appointment status is eligible, the policy allows the action, and the provider confirmed the mutation. Historical completed records are immutable.

## Queue assignment fails

Confirm the entry and barber belong to the same business/location, the barber is active and service-compatible, the queue session is open, and the caller has the operational permission. Manual overrides require a written reason and audit record.

## Automation cannot be activated

Email automation requires a configured Resend application provider. SMS automation requires Twilio credentials. Activation is owner-only, requires a written reason, and should remain in test mode until delivery QA passes.

## Square webhook is rejected

Confirm the exact notification URL and signature key, preserve the raw request body, and verify the `x-square-hmacsha256-signature`. Check event idempotency, attempt history, and dead-letter status before retrying.

## Build cannot load SWC

Delete copied dependencies and install on the target operating system:

```bash
rm -rf node_modules .next
npm ci --include=optional
npm run check
```

Do not copy Windows `node_modules` into Vercel or Linux. The isolated validation environment may also block the native package through its package mirror; that is not a passing build.

## `MotionConfig` export error

Do not reintroduce the removed incompatible named import. Adaptive motion and reduced-motion behavior are handled by the current motion system.

## Mobile video is blank

Verify the mobile H.264 asset and poster, `muted`, `playsInline`, visibility observer, opacity timeline, and reduced-motion/data-saver behavior. Do not remove the approved hero to hide a delivery issue.

## Supabase permission error

Test with the real role and business scope. Inspect RLS policies and record ownership. Never place the service-role key in browser code as a workaround.
