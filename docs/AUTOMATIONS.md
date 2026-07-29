# Automations

The notification architecture uses database jobs, templates, consent and suppression checks, language, quiet hours, idempotency, retry, delivery logs, and feature flags. `/api/cron/notifications` is protected by `CRON_SECRET` and scheduled by `vercel.json`.

Providers:

- development logger
- Resend application-email provider
- optional SMS provider

Transactional and marketing messages are classified separately. Marketing requires appropriate consent and unsubscribe handling. No job should send duplicate messages for the same idempotency key.

Supported workflow architecture covers OTP mail through Supabase Auth SMTP, booking confirmations/reminders, queue updates/ready notices, review/rebooking outreach, Barber assignment and Statement alerts, owner failures/approvals, and policy acknowledgements. A workflow remains disabled until its provider, template, consent category, and source event are verified.
