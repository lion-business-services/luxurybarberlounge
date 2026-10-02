# Scheduling Source of Truth

Decision date: 2 October 2026.

## Decision

- **Supabase is the source of truth for scheduling**: barber schedules, unavailable time, breaks, opening hours, appointments and checkout holds.
- **Square is the source of truth for payments**: payment links, payments, tips, refunds and orders.
- Square Appointments is not consulted to decide whether a barber is free. There is no fallback between two availability systems.

## Why

At the time of the decision the Square account held no Square Appointments bookings, while every live website and staff booking was stored in Supabase. The website contained a dormant code path that could ask Square for availability when a feature flag was switched on. Two systems answering the same question is how a time can look open in one place and taken in another, so the Square path and its flag (`squareLiveBooking`) were removed.

Rule 1 of the repository contract lists Square as the intended source of truth for bookings. That intention is not in effect for scheduling today and this document records the current, deliberate state. Moving scheduling to Square Appointments later would be a separate project: it needs Square Appointments enabled for the seller, team members mapped to barbers, and a one-way sync designed so that only one system ever decides availability.

## What changed

| Problem found | Fix |
| --- | --- |
| Unpaid website checkouts never expired, so abandoned checkouts blocked time indefinitely | Holds last 15 minutes (`hold_expires_at`), stop blocking the moment they lapse, and are tidied every 5 minutes |
| The Admin calendar listed only paid appointments, so time blocked by an unpaid hold looked free to staff | The calendar shows live checkouts as holds, and everything it draws comes from the booking engine |
| The gap between appointments was defined in three places with different values | One value, 5 minutes, in `location_settings`, mirrored by one constant and enforced by a constraint |
| Start times were only offered on a 15-minute grid from opening time | The engine also offers the first start after each appointment's gap |
| Finishing was only possible from "in service" and recorded no time | Finish works from any active state, records the real end and reopens unused time |
| Moving an appointment from the Admin Portal did not notify the client | One shared move operation queues exactly one notification after the change is saved |
| Guest and client reschedule pickers used the device timezone | Pickers read and show lounge time |

## Payment timing and holds

A client who pays after the 15-minute hold has lapsed is handled by `confirm_paid_appointment`:

- if the time is still free, the appointment is confirmed as normal;
- if another client now holds that time, nothing is double-booked. The booking is kept as `expired` with `deposit_status = paid`, the case is recorded in `sync_failures` with code `PAID_AFTER_HOLD_EXPIRED`, and the lounge is emailed. In the Admin Portal the booking appears on its date under "Not on the calendar" marked "Paid, needs a new time", where staff move it to an open time (which confirms it) or refund it in Square. The confirmation page tells the client the payment was received and that the lounge will contact them.
- if the confirmation step itself fails, the case is recorded with code `PAID_CONFIRMATION_FAILED` and the lounge is emailed. The checkout stays on the calendar as "Payment received", and staff confirm it from there.

The matching Square payment link is deleted when a hold expires, which makes these cases rare. A checkout that receives any verified payment while its hold is still open stops counting down and keeps its time.

## Data safety

The migration is additive. It adds columns, tables, functions, triggers and one constraint, and replaces one constraint with a stricter one. It deletes no appointments, clients or payment records. Stale unpaid holds are moved to `expired` with a history row; their records are kept. A hold with any verified payment is never expired. Appointments that were already back to back keep their place.

It can be run again safely on a database in use: early finishes stay released and nothing that is live is expired. If it cannot take its locks within 15 seconds it rolls back untouched.
