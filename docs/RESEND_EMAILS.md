# Resend Transactional Emails

Resend sends branded client and staff transactional messages; FormSubmit separately sends the requested admin booking notification.

Required environment:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=Luxury Barber Lounge <access@theluxurybarberlounge.com>
RESEND_REPLY_TO_EMAIL=info@theluxurybarberlounge.com
```

The notification worker uses provider idempotency keys and records every attempt. It sends confirmations, reminders, status changes, barber assignment notices, queue notices, and operational fallbacks. Authentication OTP continues through Supabase custom SMTP.
