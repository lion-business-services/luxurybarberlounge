# Authentication

The main login experience is passwordless email OTP through Supabase Auth. Supabase generates and verifies the six-digit token; Resend is configured as Supabase custom SMTP.

## Flow

1. User enters email at `/login`.
2. `/api/auth/request-otp` validates and throttles the request.
3. Supabase sends the OTP without revealing whether an account previously existed.
4. The accessible six-digit UI supports paste, numeric keyboard, focus progression, backspace, resend, and change-email states.
5. `/api/auth/verify-otp` verifies the token server-side.
6. Server-controlled role records are resolved.
7. Secure HttpOnly cookies are created.
8. User is routed to an authorized portal.

## Privileged access

`INITIAL_OWNER_EMAIL` bootstraps `info@theluxurybarberlounge.com` only after successful OTP verification. Staff roles are assigned server-side by authorized administrators. Multiple-role users can switch only among assigned roles, and switches are audited.

## Session controls

- HttpOnly, Secure in production, SameSite=Lax cookies
- refresh endpoint
- local sign-out and cookie clearance
- portal server-layout authorization
- optimistic Proxy gate
- RLS final boundary
- audit events
- user suspension and invitation architecture

The UI never treats an email string as authorization.

## Staff invitation flow

The owner creates an invitation in `/admin/users`. The invitation stores the intended role and invited email server-side. It does not create a privileged session. The recipient opens `/login`, verifies the same email through Supabase OTP, and only then is the pending invitation consumed, the scoped role assigned, the staff profile created, and the acceptance written to the auth audit log.
