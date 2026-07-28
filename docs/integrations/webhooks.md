# Webhook Processing

Square webhook processing follows an inbox pattern:

1. Capture the raw body.
2. Verify the signature against the configured notification URL.
3. Reject invalid requests.
4. Parse provider event ID and type.
5. Insert a sanitized event into `webhook_events` using a unique provider/event key.
6. Acknowledge accepted delivery promptly.
7. Process asynchronously or through a protected job handler.
8. Retrieve canonical Square records before financial decisions.
9. Map location, team member, customer, booking, order, and payment IDs.
10. Run deterministic attribution and provisional commission calculation.
11. Enqueue consent-aware notifications.
12. Record attempts, sanitized errors, retry status, and dead-letter outcomes.

Manual replay must reuse idempotency keys and may never duplicate a notification or commission calculation.
