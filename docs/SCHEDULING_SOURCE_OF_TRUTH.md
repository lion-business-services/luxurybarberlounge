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

- if Square closes the checkout for less than the required service payment (a Square coupon code, a loyalty reward, a cash tender), the booking is not confirmed. This is the full prepayment rule from `202609102150_guard_appointment_link_verified_square_payment.sql`, and it is unchanged. The case is recorded with code `CHECKOUT_BELOW_REQUIRED_PAYMENT`, the lounge is emailed, and the confirmation page tells the client why the appointment is not confirmed. Booking checkouts are created with `enable_coupon: false` and `enable_loyalty: false`, which hides those boxes even though the Square location setting allows coupons, so this case should not arise for new checkouts.

The matching Square payment link is deleted when a hold expires, which makes these cases rare. A checkout that receives any verified payment while its hold is still open stops counting down and keeps its time.

## One rule per question (consistency audit, October 2026)

Every screen that describes a booking must answer from the same rule the booking engine enforces. The rules live in `src/lib/booking/rules.ts` and are covered by tests that fail the build when a screen drifts.

| Question | Rule | Used by |
|---|---|---|
| Does this appointment hold a barber's time? | `appointmentOccupancy` (status only, never payment state) | Booking page, database guard, staff timelines |
| Must a staff calendar list it? | `showsOnStaffSchedule` / `STAFF_SCHEDULE_FILTER`: everything that holds time, plus paid history | Admin calendar, Barber calendar, appointments list, client history |
| Is it still ahead of the client? | `isOpenAppointmentStatus` | Client portal "Upcoming" and "Next visit" |
| Is it an appointment for the barber's lists and numbers? | `TIMELINE_STATUSES` | Barber portal lists and performance figures |
| Should the 24-hour reminder go out, and what does it say? | `reminderDecision`, decided when the reminder is due, text written from the appointment as it is then | Notification processor. A move resets the reminder to the new time |
| What time is it shown as? | The lounge time zone, always | `src/lib/portal/format.ts`, calendars, emails |

Appointments of a barber who was deactivated or archived stay on the Admin calendar in a column marked inactive.

Known gaps that are documented and not yet changed are listed in `docs/KNOWN_CONSISTENCY_GAPS.md`.

## Data safety

The migration is strictly additive. It adds columns, tables, functions, triggers and one stricter constraint, and removes nothing: no appointments, clients or payment records, and no database object. The earlier overlap constraint stays in place (the new one is stricter), the superseded time-off trigger function is kept as a pass-through, and the earlier six-argument move function is renamed to `reschedule_appointment_atomic_legacy`. Stale unpaid holds are moved to `expired` with a history row; their records are kept. A hold with any verified payment is never expired. Appointments that were already back to back keep their place.

It can be run again safely on a database in use: early finishes stay released and nothing that is live is expired. If it cannot take its locks within 15 seconds it rolls back untouched.
