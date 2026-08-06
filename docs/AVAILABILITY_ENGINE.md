# Availability Engine

## Inputs

Availability considers location hours, holiday overrides, barber schedules, breaks, approved time off, active appointments, active slot holds, service duration, add-on duration, cleanup buffer, minimum lead time, maximum booking window, location, timezone, and barber service eligibility.

## Calculation

All persisted timestamps are UTC. Local dates and opening hours are interpreted in `America/New_York`. Slots are returned only when the full service plus cleanup buffer fits inside both the barber and location windows and does not overlap a blocking record.

## Submission revalidation

The selected slot is never trusted from the browser. `/api/booking/submit` recalculates availability, then calls the atomic database function. A concurrent reservation produces `SLOT_TAKEN` and refreshed alternatives rather than a false confirmation.

## Public catalog versus operational availability

The public catalog RPC reports whether each barber has at least one active current schedule. It deliberately does not expose schedule rows or staff user IDs. Exact times are calculated only by the protected availability endpoint.

Profiles without a confirmed schedule remain visible for discovery but are disabled in the selector. Ruben follows this rule until the owner publishes his actual hours.

## Operational configuration

The owner must maintain real schedules, breaks, time off, service eligibility, and holiday hours. Administrative catalog bootstrap seeds a default schedule only when an eligible profile has no active schedule and the centralized content contains confirmed weekdays. It never disables or replaces an existing owner-managed schedule during catalog reads.
