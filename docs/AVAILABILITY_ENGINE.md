# Availability Engine

There is exactly one availability engine. The public booking page, the Admin Portal calendar, the Barber Portal calendar, every reschedule path and the database all apply the rule below. The decision record for why Supabase is the scheduling source of truth is in [SCHEDULING_SOURCE_OF_TRUTH.md](./SCHEDULING_SOURCE_OF_TRUTH.md).

## The rule

A start time `S` with duration `D` is bookable for a barber when all of the following hold:

1. `[S, S+D)` lies inside the barber's saved working schedule for that date, clamped to the lounge's opening hours (a holiday row replaces the weekly row).
2. `[S, S+D)` does not overlap approved unavailable time (`barber_time_off`, status `approved`, kind `unavailable`).
3. `[S, S+D)` does not overlap a scheduled break (`barber_breaks`, status `scheduled`).
4. For every appointment or live checkout hold `[bs, be)` of that barber: `S >= be + 5 minutes` or `S + D + 5 minutes <= bs`.
5. `S` is not in the past and not more than 90 days ahead.

Nothing else removes time. There is no lead time, no rounding of free time, and no second buffer.

### The 5-minute gap

- The value lives in `location_settings.default_buffer_minutes` (5) and is mirrored by `BOOKING_BUFFER_MINUTES` in `src/lib/booking/rules.ts`.
- It is applied once between two neighbouring appointments. It is not required before closing time, before time off or before a break.
- The database stores `appointments.occupied_until = end + buffer`, and the exclusion constraint `appointments_no_buffered_overlap` compares `[starts_at, occupied_until)` ranges. The earlier constraint `appointments_no_active_overlap` (no buffer) is weaker and remains alongside it. Two half-open ranges that include one buffer each can only stop overlapping when the real gap is at least one buffer, so the gap can never be doubled or skipped.

### What occupies time

| Record | Occupies time |
| --- | --- |
| `confirmed`, `checked_in`, `assigned`, `in_service` | Always, from start to scheduled end |
| `slot_held`, `pending_confirmation` (unpaid website checkout) | Only until `hold_expires_at` (15 minutes). A hold with any verified payment stops counting down (`hold_expires_at` is null) and keeps its time |
| `completed` | From start to the earlier of scheduled end and `completed_at`. Finished before its scheduled start: nothing |
| `cancelled_*`, `declined`, `expired`, `failed`, `no_show`, `rescheduled`, `draft` | Never |

An expired hold stops blocking the instant its window passes, in the engine and in the database guard. The `/api/cron/appointments` job (every 5 minutes) only tidies the stored status and closes the matching Square checkout link.

### Appointments that were back to back before the rule

While the gap was zero, two appointments could be booked back to back. Those keep their place: the migration records the real gap on the earlier one (`buffer_minutes_override`), so the constraint accepts the existing pair. The exception is tied to that exact placement. It is cleared when the appointment is moved, it is never set for a new booking, and any new booking next to such an appointment still needs the full 5 minutes.

## Start times offered

For each working window the candidates are:

- the 15-minute grid counted from the window's opening time, and
- every release point: the first instant after an appointment's gap, and the first instant after time off or a break.

Release points are what make 12:50 bookable after an appointment that ends at 12:45, and 12:35 bookable after an appointment that was finished early at 12:30. The Admin calendar snaps drags to 5 minutes for the same reason.

## Layers

| Layer | File | Role |
| --- | --- | --- |
| Rule constants | `src/lib/booking/rules.ts` | Buffer, hold length, blocking statuses. Dependency-free |
| Pure engine | `src/lib/booking/slots.ts` | `evaluatePlacement`, `generateStartTimes`, `freeIntervals`. No database, no clock |
| Calendar model | `src/lib/booking/calendar-model.ts` | Turns calendar API facts into the engine's intervals for the staff timelines and the drag preview |
| Server loader | `src/lib/booking/availability.ts` | One round of parallel queries, then the pure engine. `searchSupabaseAvailability`, `checkPlacement`, `listPlacements` |
| Move operation | `src/lib/booking/reschedule.ts` | The one way to move an appointment (admin, client, guest) |
| Database guard | `supabase/migrations/202610020001_scheduling_single_source_of_truth.sql` | Trigger `enforce_appointment_barber_availability`, constraint `appointments_no_buffered_overlap`, atomic RPCs |
| Database hardening | `supabase/migrations/202610020002_scheduling_function_hardening.sql` | Pins `search_path` on the four pure helper functions and removes the default execute grant from the realtime broadcast trigger function. Apply it after the guard migration |

The integration test `tests/integration/scheduling-rules-agreement.test.ts` fails the build when the application constants and the migration disagree.

## Concurrency

Every write that places or moves an appointment takes a per-barber advisory lock inside the transaction (`barber_calendar_lock_key`), then re-validates against committed data. The exclusion constraint is a second, independent barrier. Twelve simultaneous requests for one slot produce exactly one booking (see `supabase/tests/scheduling/03_concurrency.sh`).

## Submission revalidation

The selected slot is never trusted from the browser. `/api/booking/submit` recalculates availability, then calls `create_appointment_atomic`. A concurrent reservation produces `SLOT_TAKEN` with refreshed alternatives rather than a false confirmation.

## Family bookings

Family 1 to 5 is one adult service followed by one to five Kids Haircuts with the same barber, stored as one appointment with rows in `appointment_service_items`.

- Price: adult price plus the Kids Haircut price per child, read from the live `services` rows.
- Duration: the sum of the service durations plus one 5-minute changeover between consecutive family members.
- Only one contiguous window for the whole family is offered. The booking is reserved, paid, moved and finished as a whole.
- The database recomputes price and duration when reserving and refuses the booking with `BOOKING_CATALOG_CHANGED` if the catalog changed in between.

## Finishing an appointment

`complete_appointment_atomic` records `completed_at`, keeps the scheduled start and end for history and commission, and shortens `occupied_until` so the unused time reopens after the gap. It is idempotent and refuses an appointment that starts more than 120 minutes in the future. An appointment finished before its scheduled start releases its whole reservation.

## Moving an appointment

`reschedule_appointment_atomic` moves time, barber or both in one transaction and keeps the stored duration. Confirmed appointments can be moved, and so can a paid booking that lost its time (`expired` with `deposit_status = paid`), which confirms it at the new time. If someone else changed the barber between the request and the lock, the move is refused with `APPOINTMENT_CHANGED` instead of overwriting that change. Handing an appointment to another barber requires an active, unarchived barber who offers every service in the booking.

## Timezone

All timestamps are stored in UTC. Dates, schedules and opening hours are interpreted in `America/New_York` through `src/lib/booking/timezone.ts`, including the daylight saving changes. Reschedule pickers read and show lounge time regardless of the device timezone.

## Live updates

Statement-level triggers broadcast `availability_changed` on the public Realtime channel `booking-availability:northfield` whenever appointments, time off, schedules, breaks or holiday hours change. The payload carries no personal data. The booking page and both calendars reload on the event and also refresh on a timer, on focus and when the tab becomes visible. The availability API is never cached.

## Public catalog versus operational availability

The public catalog RPC reports whether each barber has at least one active current schedule. It does not expose schedule rows or staff user IDs. Exact times are calculated only by the availability endpoint.

## Operational configuration

The owner maintains real schedules, breaks, time off, service eligibility and holiday hours. Catalog bootstrap seeds a default schedule only when an eligible profile has no active schedule and the centralized content contains confirmed weekdays. It never disables or replaces an existing owner-managed schedule.

## Observability

Scheduling decisions are logged as structured lines with a correlation id, barber id, times, duration, buffer and a reason code (`booking-availability`, `booking-reschedule`, `booking-finish`, `booking-hold-expiry`). Logs never contain client names, contact details, notes or payment data.
