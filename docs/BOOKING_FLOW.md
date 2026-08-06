# Booking Flow

## Client steps

1. **Service:** category, service, starting price, duration, optional enhancements, and preparation.
2. **Barber:** a specific eligible barber or First Available.
3. **Date and time:** real server-generated slots in `America/New_York`.
4. **Client details:** name, email, phone, language, history, notes, optional inspiration image, communication consent, and policy acknowledgement.
5. **Review and confirm:** service, barber, date, duration, estimate, deposit state, location, and contact details.

## Submission guarantees

- Shared Zod validation runs on the server.
- The browser cannot create privileged rows directly.
- The slot is rechecked immediately before creation.
- Postgres exclusion constraints reject overlap races.
- The idempotency key returns the same saved appointment after browser or network retries.
- A confirmation page is shown only after the appointment exists.

## Confirmation

The page shows the public reference, status, service, barber, time, duration, address, call and directions actions, Google Calendar, and `.ics` download. Guest management uses a hashed, unpredictable token; authenticated users use RLS-protected portal routes.
