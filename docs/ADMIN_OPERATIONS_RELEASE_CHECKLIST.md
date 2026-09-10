# Admin operations release checklist

Before promoting admin operations changes to production:

1. Production build must compile and pass TypeScript.
2. Walk-in form submissions must create a live `queue_entries` record.
3. Active walk-ins must remain visible on Admin Queue and Queue Board until a terminal status is deliberately selected.
4. Cash/Square payment state must be stored in `walk_in_payments` and reflected in Payment Tracking.
5. A true walk-in must not be allowed to reach `completed` before payment is `paid`.
6. Paid walk-ins must remain in service until reception deliberately selects `completed`.
7. Website appointments must remain excluded from the operational appointment calendar until full payment is verified.
8. Appointment and walk-in payment records must remain separated in Payment Tracking.
9. Barber schedules and approved time-off must render alongside the appointment calendar.
10. Existing Square, commission, booking and notification jobs must remain enabled and independently recoverable through their scheduled reconciliation paths.
