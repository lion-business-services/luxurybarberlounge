# Automations

The automation architecture uses versioned rules, triggers, conditions, delays, schedules, channels, consent requirements, quiet hours, idempotency keys, retries, test mode, delivery logs, and audited activation.

## Management

`/admin/automations` lists live Supabase rules. The owner may create a rule only in test mode, record a reason, switch test mode, disable it, or activate it. Email activation is blocked until Resend is configured; SMS activation is blocked until Twilio is configured. Managers may review operational state but cannot activate rules.

## Processing

- `notification_jobs` is the durable queue.
- `notification_deliveries` stores sanitized provider attempts.
- `/api/cron/notifications` processes due messages and requires `CRON_SECRET`.
- `/api/cron/webhooks` processes verified provider inbox events and requires `CRON_SECRET`.
- The release intentionally does not commit high-frequency Vercel cron schedules. Configure Supabase Cron or an approved scheduler after production credentials and delivery QA pass.

Transactional and marketing messages are classified separately. Marketing requires purpose-specific consent and suppression checks. OTP is delivered by Supabase Auth through Resend custom SMTP, not by the application notification queue.

Supported workflows include booking confirmation/reminders, cancellation/reschedule, queue updates/ready notices, thank-you/review/rebooking, membership notices, barber assignments/statements, owner failure alerts, and approved campaigns. A rule remains inactive until its provider, source event, template, consent category, quiet hours, and idempotency behavior are verified.
