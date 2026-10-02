# Scheduling database tests

These files exercise the Postgres side of the booking rules (the trigger
guard, the buffered exclusion constraint and the `*_atomic` RPCs) on a
**disposable local database**. They are the database half of the rule set whose
application half lives in `src/lib/booking/rules.ts` and
`src/lib/booking/slots.ts` (covered by `tests/unit/scheduling-rules.test.ts`).

| File | Purpose |
| --- | --- |
| `00_baseline.sql` | The scheduling slice of the production schema as it was before migration `202610020001`. Supabase-managed pieces (auth, realtime, API roles) are stubbed. |
| `01_seed.sql` | Production-shaped seed data plus legacy rows the migration must backfill (abandoned checkouts, a paid-but-unpromoted hold, a historical completion). |
| `02_scenarios.sql` | About 130 assertions: buffer, schedule, opening hours, DST, unavailability, breaks, holds, late payment, rescheduling, reassigning, family bookings, Finish, idempotency, realtime, catalog. |
| `03_concurrency.sh` | Real races over separate connections: 12 simultaneous bookings for one slot, staggered overlapping bookings, reschedule versus booking. |
| `run.sh` | Rebuilds the database, applies the migration twice (re-runnable check) and runs everything. |

## Running

Requires a local PostgreSQL 14+ with the `btree_gist` and `citext` extensions.

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres supabase/tests/scheduling/run.sh
```

`run.sh` refuses any non-local host. It drops and recreates the database named
by `LBL_TEST_DATABASE` (default `lbl_scheduling_test`). **Never point it at the
hosted Supabase project.**

## Keeping application and database in agreement

The same cases are asserted on both sides on purpose: an appointment ending
12:45 blocks until 12:50; 12:50 is bookable; the buffer is never doubled; an
expired checkout hold releases at once; finishing at 12:30 reopens 12:35; a
family block is contiguous and moves as one. When a rule changes, change
`rules.ts`, the migration, and both test suites together.
