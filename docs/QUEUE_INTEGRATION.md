# Queue Integration

Scheduled appointments and walk-ins share one operational queue.

- Appointment check-in creates a linked queue entry.
- Queue assignment synchronizes the appointment's staff assignment and status.
- `checked_in`, `assigned`, `in_service`, `completed`, `no_show`, and cancellation states remain aligned.
- Deterministic assignment considers timing, service eligibility, requested barber, availability, workload, and authorized overrides.
- Every assignment and status change is auditable.

## Television display

`/queue-board` refreshes every five seconds and returns only a privacy-safe token or consented display name, barber, state, and estimated wait. It never exposes email, phone, IDs, private notes, or service history.
