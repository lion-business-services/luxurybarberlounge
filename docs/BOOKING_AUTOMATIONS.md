# Booking Automations

The owner does not need to configure technical workflows during daily operations. Protected cron routes run the approved background jobs.

- `/api/cron/notifications` every 5 minutes
- `/api/cron/appointments` every 15 minutes
- `/api/cron/formsubmit` every 10 minutes
- `/api/cron/queue` every 5 minutes
- `/api/cron/webhooks` every 2 minutes
- `/api/cron/commissions` every 15 minutes

Every worker requires `CRON_SECRET`, claims jobs before processing, uses idempotency, records delivery, applies backoff, and preserves terminal failures for review.
