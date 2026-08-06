> **Historical release record.** Superseded by `RELEASE-V11.3.md` and `docs/FINAL_RELEASE_REPORT.md`.

# Luxury Barber Lounge v11.2 Booking Activation Fix

This release corrects the production condition that allowed `/api/booking/catalog` to return an empty live catalog and caused `/book` to display “Online booking is temporarily unavailable.”

## Corrections

- Adds migration `202608060015_booking_launch_activation.sql`.
- Seeds the verified launch barber, five core services, service eligibility, service location, business hours, and weekly barber schedule.
- Rejects missing booking migrations instead of silently returning empty services or barbers.
- Removes CDN caching from the booking catalog response.
- Retries the catalog bootstrap briefly in the browser.
- Validates all availability data sources instead of treating database errors as no availability.
- Sends due Resend booking confirmations immediately after a successful atomic booking while retaining protected cron retries.
- Keeps the admin appointment email and admin appointment record integrated with the same appointment.

## Required deployment action

Run `npx supabase@latest db push` after applying this release. Local and remote migrations must match through `202608060015` before the booking page can be considered live.
