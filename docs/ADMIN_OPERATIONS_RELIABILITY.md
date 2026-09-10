# Admin operations reliability

The Luxury Barber Lounge operational workflow has three distinct sources of truth.

## Walk-in queue

A walk-in form submission creates a `queue_entries` row in `waiting` status. Admin Queue loads active queue entries from the database with no-store responses and frequent reconciliation. The public Queue Board uses the same operational queue data with a Supabase realtime invalidation channel and a timed refresh fallback.

Walk-in payment is recorded in `walk_in_payments`. Cash payment is explicitly recorded by reception. Square payment remains pending until Square reconciliation verifies it. A paid walk-in remains active in the queue until reception marks the service completed.

The database trigger `queue_entries_require_paid_walkin_completion` prevents a true walk-in from entering `completed` status unless a paid `walk_in_payments` record exists. The API enforces the same rule for a clear operator error message.

## Appointment payments

Website appointments remain pending outside the operational appointment calendar until full payment is verified. The admin appointment calendar only loads paid appointment lifecycle records. Payment Tracking reads appointment payment records separately from walk-in payments.

## Payment Tracking

`/admin/payments` is the financial operations audit view. It intentionally remains separate from Commissions because payment collection and barber compensation are different concerns.

- Walk-ins are sourced from `walk_in_payments` and enriched with queue/client/barber/service data.
- Appointments are sourced from `appointment_payment_links` and enriched with appointment and Square payment data.
- Commissions continue to use the existing reconciliation and settlement workflow.

## Calendar

`/admin/appointments` uses a seven-day barber calendar. It combines paid appointments, active barber schedules, and approved time-off records. Unpaid website checkout holds never appear as confirmed appointments.

## Recovery behavior

Queue Board realtime updates are supplemented by a five-second refresh fallback. Admin Queue refreshes its canonical snapshot every three seconds. Payment Tracking refreshes every ten seconds and the appointment calendar every fifteen seconds. These fallbacks are deliberate so transient browser sleep, dropped realtime connections, or missed broadcasts do not leave the operational displays stale.
