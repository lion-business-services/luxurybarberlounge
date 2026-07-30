# Authentication Architecture

## Flow

1. The browser submits an email to `POST /api/auth/request-otp`.
2. The server validates the address, applies a non-durable preview rate limit, and requests a six-digit Supabase email OTP.
3. Supabase Auth creates the token and sends the branded message through Resend custom SMTP.
4. The browser submits the six digits to `POST /api/auth/verify-otp`.
5. The server verifies the OTP with Supabase, consumes an eligible staff invitation, ensures the default role, records a hashed session audit record, and writes HttpOnly cookies.
6. `selectPrimaryRole()` resolves overlapping roles deterministically: super admin, owner, manager, receptionist, barber, then client.
7. The server returns only the authorized destination. Client-side email comparison is never authorization.

## Session controls

- Access, refresh, and active-role cookies are HttpOnly, Secure in production, SameSite=Lax, and path scoped to `/`.
- Protected layouts call `requirePortalAccess()` before rendering data.
- Expired access tokens are refreshed through `/api/auth/refresh`.
- Current-device and all-device logout revoke Supabase sessions, clear cookies, and mark hashed session metadata revoked.
- OTP values and raw tokens are never stored in application logs.

## Owner bootstrap

`INITIAL_OWNER_EMAIL` is checked only after Supabase has verified the email. The server assigns the owner role to the authenticated Supabase user ID within the Luxury Barber Lounge business scope. No invitation or self-registration endpoint may assign owner or super-admin access.

## Production requirements

- Supabase Email provider enabled.
- Confirm Email disabled for the code-only passwordless flow.
- Magic Link/OTP template contains `{{ .Token }}` and does not rely on `{{ .ConfirmationURL }}`.
- Resend custom SMTP configured and verified.
- `NEXT_PUBLIC_PORTAL_DEMO_MODE=false`.
