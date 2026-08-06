# Launch Checklist

- [ ] Apply migrations through `202608060014`.
- [ ] Regenerate and commit Supabase types.
- [ ] Confirm business hours and holiday hours.
- [ ] Confirm every live barber identity, staff account, services, schedule, breaks, and time off.
- [ ] Confirm real service prices, durations, deposits, and policy wording.
- [ ] Set `BOOKING_MANAGE_SECRET` and `CRON_SECRET`.
- [ ] Confirm Supabase health and RLS tests.
- [ ] Confirm Resend domain and transactional delivery.
- [ ] Activate FormSubmit recipient and verify a live message.
- [ ] Test a saved booking while FormSubmit is deliberately unavailable.
- [ ] Test duplicate submission and concurrent slot conflict.
- [ ] Test client OTP linking and own-appointment access.
- [ ] Test admin confirm, reschedule, cancel, check-in, queue, complete, and no-show.
- [ ] Open `/queue-board` on the shop display and verify privacy.
- [ ] Test `.ics`, Google Calendar, directions, and call actions.
- [ ] Test all mobile and desktop breakpoints.
- [ ] Run production build and inspect browser/server logs.
- [ ] Set the QR code to the canonical `/book` URL.
