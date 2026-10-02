# Admin Appointments

`/admin/appointments` is a concise shop-operations workspace, not a developer console.

## Views and filters

- Today and all dates
- Status
- Barber
- Source
- Search by client, phone, email, reference, service, or barber

## Actions

Authorized reception, manager, owner, and super-admin users can confirm, decline, cancel, check in, start service, complete, mark no-show, reassign an eligible barber, reschedule to a real open slot, add an internal note, and retry the administrative email.

Check-in creates a linked queue entry. Status and assignment changes write immutable history and audit rows. The workspace exposes delivery state without exposing provider secrets.

## Timeline calendar (October 2026)

The Appointments Calendar is a timeline drawn from the booking engine's own intervals, so it cannot disagree with the public booking page. See [AVAILABILITY_ENGINE.md](./AVAILABILITY_ENGINE.md).

- **Day view** shows one column per barber. **Week view** shows seven days for one barber.
- Each column shows working hours, open time, appointments, checkouts in progress, unavailable time, breaks and the 5-minute gap after each appointment.
- **Drag and drop**: drag a confirmed appointment to another time, another day (week view) or another barber (day view). The drop target turns green when the move is valid and red with the reason when it is not. A confirmation dialog shows the old and new time. The card moves only after the database has saved the change; a rejected move leaves it where it was and shows why.
- **One barber, seven days**: choosing a barber in the Barber menu shows that barber's next seven days side by side, starting on the selected date. Choosing "All barbers" returns to one day with every barber side by side.
- **Carrying a card further**: while a card is carried, the page scrolls by itself near the top and bottom of the screen. Holding the card on the left or right edge of the calendar for a moment shows the earlier or later days (the previous or next day in the one-day view), so an appointment can be taken to any date without letting go. The edges only react after the card has been moved sideways, so a straight up or down move never changes the days. Escape cancels.
- **Touch and keyboard**: open the appointment and use "Move appointment", which lists only the open times that fit the whole appointment.
- **Finish** records the actual end time. If the service ends early, the rest of the reserved time reopens after the 5-minute gap. A second click changes nothing.
- **Family bookings** appear as one card and list each family member with their service, time and price in the details panel.
- **Paid, needs a new time**: a booking paid after its checkout hold ended, whose time had been taken, is listed under "Not on the calendar". Open it and move it to an open time, which confirms it, or refund it in Square.
- **Payment received**: a checkout whose payment arrived but was not confirmed automatically shows on the timeline. Select it to confirm.
- The client is notified once per saved move. A notification problem never undoes the move.
- The calendar follows live changes through the `booking-availability:northfield` channel and also refreshes every 20 seconds.

API: `GET /api/admin/calendar`, `GET /api/admin/appointments/slots`, `PATCH /api/admin/appointments` (`reschedule`, `reassign`, `complete`, `confirm` run as atomic database functions).
