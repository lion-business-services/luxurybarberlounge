# Troubleshooting

This guide covers the production-safe recovery path for Luxury Barber Lounge operational workflows. Never repair a client record by deleting financial history or bypassing the paid-before-completed safeguards.

## Walk-in queue is not updating

1. Confirm the walk-in was successfully submitted and exists in the operational queue.
2. Refresh the Admin Queue. The admin workspace polls frequently even when realtime delivery is unavailable.
3. On the TV Queue Board, confirm the connection badge is Live or Auto-refresh. The board has a polling fallback and also refreshes when the browser regains focus or network connectivity.
4. If a queue entry exists in Admin but is not visible publicly, verify its lifecycle status and public-display consent. Public contact details must never be exposed.
5. If the API is unavailable, keep the last confirmed board state visible, restore connectivity, and refresh. Do not create duplicate walk-ins as a workaround.

## Walk-in cannot be marked completed

A true walk-in must have a paid payment record before completion. This is enforced both in the application workflow and in the database. Reception should first record the correct Cash or Square payment, verify the amount and payment method, then complete the service. Do not disable the database trigger to work around an unpaid entry.

## Payment Tracking does not show a walk-in payment

Confirm the queue entry was marked Paid rather than only having a payment method selected. Verify the amount, barber, service, queue entry, and paid timestamp. The Payment Tracking workspace intentionally separates walk-ins from appointment payments and is independent of the Commissions workspace.

## Appointment calendar time appears wrong

All appointment display and rescheduling logic must use the `America/New_York` business timezone with timezone-aware conversion. Never hard-code `-04:00` or `-05:00`; daylight-saving transitions must be handled by the shared timezone utilities.

## Appointment does not appear in Admin Appointments

The operational calendar shows paid appointments in supported lifecycle states. Unpaid website checkout holds are intentionally excluded until payment verification promotes them into the paid schedule. Confirm the appointment deposit/payment status before treating this as a calendar failure.

## Square or payment reconciliation issue

Do not manually rewrite reconciled amounts. Confirm the Square webhook or reconciliation job has processed the payment and inspect the corresponding payment and commission records. Commission statements report calculated amounts and do not themselves move funds.

## Reliability checks after a fix

Run source quality gates, unit tests, integration tests, migration validation, RLS validation, route validation, secret scanning, and the production build. Verify the Vercel deployment is Ready before promoting. After production deployment, smoke-test walk-in submission, queue visibility, paid status, payment tracking, appointment calendar loading, and existing booking flows without modifying real financial records unnecessarily.
