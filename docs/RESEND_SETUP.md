# Resend Setup

1. Verify the approved sending domain or sender in Resend.
2. Set `RESEND_API_KEY` only in the hosting provider's server environment.
3. Set `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO_EMAIL` to approved values.
4. Set `EMAIL_PROVIDER=resend` only after a sandbox or preview delivery succeeds.
5. Run booking confirmation, reminder, cancellation, reschedule, barber assignment, and retry tests.
6. Confirm delivery logs and idempotency keys in Supabase.

Never expose the API key through a `NEXT_PUBLIC_` variable. If Resend is unavailable, the appointment remains stored and the notification job moves through retry/failure states without generating a false booking confirmation.
