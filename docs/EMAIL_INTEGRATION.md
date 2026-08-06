# Email Integration

A successfully stored booking creates independent notification work. Email delivery is not the appointment database and a provider failure must not delete or invalidate a stored appointment.

- **FormSubmit:** administrative booking notification to `info@theluxurybarberlounge.com`. The booking is saved first, delivery status is logged, and failed attempts are retryable.
- **Resend:** branded transactional messages for client confirmations, reminders, status changes, barber assignments, and operational alerts when configured.

Idempotency keys prevent duplicate delivery during retries. Emails exclude passwords, OTP values, service-role keys, provider credentials, payment-card data, private internal notes, and authentication tokens. Provider activation and domain verification are documented separately.
