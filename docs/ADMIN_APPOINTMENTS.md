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
- **Touch and keyboard**: open the appointment and use "Move appointment", which lists only the open times that fit the whole appointment.
- **Finish** records the actual end time. If the service ends early, the rest of the reserved time reopens after the 5-minute gap. A second click changes nothing.
- **Family bookings** appear as one card and list each family member with their service, time and price in the details panel.
- The client is notified once per saved move. A notification problem never undoes the move.
- The calendar follows live changes through the `booking-availability:northfield` channel and also refreshes every 20 seconds.

API: `GET /api/admin/calendar`, `GET /api/admin/appointments/slots`, `PATCH /api/admin/appointments` (`reschedule`, `reassign`, `complete`, `confirm` run as atomic database functions).
