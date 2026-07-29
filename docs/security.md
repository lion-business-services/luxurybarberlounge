# Security

## Boundaries

- Service-role, Square, Resend, SMS, webhook, and cron secrets are server-only.
- Portal layouts authorize server-side; RLS authorizes database access.
- Proxy is an optimistic redirect, not the final boundary.
- Staff roles are server assigned.
- Evidence/private media use private storage and signed URLs.
- Webhooks require signature verification and idempotent inbox records.
- Locked financial history is immutable.

## Controls

Secure cookies, OTP throttling, verification throttling, generic anti-enumeration responses, session refresh/logout, role-switch audit, input validation, CSP/security headers, secret scanning, audit logs, consent records, delivery idempotency, and least-privilege provider keys.

## Production checklist

Rotate any exposed credential, enable provider logs/alerts, test RLS with every role, verify webhook URL/signature, protect cron endpoints, configure backup/recovery, and review the worker-classification issue with counsel.
