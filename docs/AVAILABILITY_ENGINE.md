# Availability Engine

## Inputs

Availability considers location hours, holiday overrides, barber schedules, breaks, approved time off, active appointments, active slot holds, service duration, add-on duration, cleanup buffer, minimum lead time, maximum booking window, and barber service eligibility.

## Calculation

All persisted timestamps are UTC. Local dates and opening hours are interpreted in `America/New_York`. Slots are returned only when the full service plus cleanup buffer fits inside the barber and location windows and does not overlap a blocking record.

## Submission revalidation

The selected slot is never trusted from the browser. `/api/booking/submit` recalculates availability, then calls the atomic database function. A concurrent reservation produces `SLOT_TAKEN` and safe alternatives rather than a false confirmation.

## Operational configuration

The owner must maintain real schedules, breaks, time off, service eligibility, and holiday hours. Catalog synchronization seeds a schedule only when a live barber has no schedule; it never overwrites an existing owner-managed schedule.
