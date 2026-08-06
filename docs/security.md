# Security Architecture

## Trust boundaries

- Supabase Auth establishes identity. Application code never treats an email string in the browser as authorization.
- Server layouts and route handlers resolve the authenticated Supabase user, active account state, active role, business scope, and route permission before loading protected data.
- PostgreSQL Row Level Security is the final record-level boundary for authenticated browser queries.
- `SUPABASE_SERVICE_ROLE_KEY`, Resend, Square, SMS, AI, webhook, and cron credentials are server-only.
- Public navigation, hidden menu items, and client-side redirects are convenience controls, not security controls.
- Provider-owned financial and booking history is referenced and extended in Supabase, not silently rewritten.

## Authentication and sessions

- Primary access is passwordless six-digit Supabase email OTP delivered through Resend custom SMTP.
- OTP requests and verification return generic responses and do not disclose whether an account existed before verification.
- OTPs, access tokens, refresh tokens, provider secrets, and webhook signature values are never written to application logs.
- Session cookies are HttpOnly, SameSite=Lax, Secure in production, and scoped to `/`.
- Current-device logout and all-device logout revoke the appropriate Supabase session and clear protected client state.
- Session audit metadata stores hashes of access tokens, IP addresses, and user agents. Raw values are not retained.
- Suspended or disabled accounts are rejected before protected content is rendered.

## Roles and privileged access

- New verified users receive only the client role by default.
- `INITIAL_OWNER_EMAIL` is evaluated only after Supabase verifies the address. The server then assigns the owner role to the authenticated user ID within the configured business scope.
- No invitation endpoint may assign owner or super-admin access.
- Future barber, receptionist, and manager accounts require an owner-created invitation and successful OTP verification by the invited email.
- Owner-only nested layouts protect integrations, credentials, roles, permissions, audit, security, policy, attribution, commission, statement, dispute, reconciliation, webhook, feature-flag, data-control, and AI-governance routes.
- A user cannot insert or elevate their own role through the browser.

## Data protection

- Client data loaders and RLS policies are self-scoped.
- Barber and reception access is restricted to permitted operational records.
- Manager access is business-scoped and excludes owner governance.
- Internal notes are separate from client-visible notes.
- Private files use MIME and size validation, private buckets, and signed URLs.
- Service-role operations are not exposed to browser bundles.
- Locked calculations, statements, attribution decisions, audit history, provider financial records, and consent history are corrected through append-only adjustments or forward records.

## Request and integration controls

- Inputs are validated with strict schemas before database or provider operations.
- Sensitive administrative mutations require a written reason and create an audit record with actor, action, entity, entity ID, before/after state where appropriate, timestamp, and correlation context.
- Square webhooks require raw-body signature verification, provider event idempotency, attempt logging, retry limits, and dead-letter handling.
- Notification jobs use consent checks, quiet hours, idempotency keys, retry limits, and delivery logs.
- Automation activation is owner-only and provider-gated. New rules begin inactive and in test mode.
- AI is advisory and cannot grant roles, confirm bookings, approve refunds, change attribution, decide queue priority, or authorize settlement.

## Browser and platform controls

- Security headers are defined in Next.js configuration, including Content Security Policy, clickjacking protection, content-type protection, referrer policy, and permissions policy.
- Operational portals do not load public cinematic video or homepage animation systems.
- Protected responses use no-store behavior where sensitive state must not be cached.
- Error responses are sanitized and do not expose raw provider exceptions or secrets.
- Repository secret scanning runs in `npm run check:source`.

## Production verification

1. Rotate any key ever exposed in a screenshot, message, log, or repository history.
2. Run `npm run scan:secrets`, `npm run validate:rls`, and the live role matrix in staging.
3. Confirm a client cannot access `/admin` or another client's records.
4. Confirm a manager cannot access owner-only nested routes.
5. Confirm owner bootstrap works only for the verified configured owner email.
6. Test current-device logout, all-device logout, session expiry, suspension, and browser back navigation.
7. Verify Resend, Square, webhook, cron, and SMS logs never include credentials or OTP values.
8. Enable backup, restore, alerting, retention, and incident ownership appropriate to the production Supabase plan.
9. Review worker classification, privacy, retention, messaging consent, and financial workflows with qualified counsel.
