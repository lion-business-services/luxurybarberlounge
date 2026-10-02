#!/usr/bin/env bash
# Rebuilds a disposable local database and runs the scheduling scenarios.
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres supabase/tests/scheduling/run.sh
# Never point this at a hosted Supabase project: it drops and recreates a database.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
database="${LBL_TEST_DATABASE:-lbl_scheduling_test}"
migration="$here/../../migrations/202610020001_scheduling_single_source_of_truth.sql"

case "${PGHOST:-localhost}" in
  localhost|127.0.0.1|/*) ;;
  *) echo "Refusing to run against non-local host ${PGHOST}." >&2; exit 2 ;;
esac

run() { psql -v ON_ERROR_STOP=1 -q -At "$@"; }

run -d postgres -c "drop database if exists ${database}" -c "create database ${database}" >/dev/null 2>&1
run -d "$database" -f "$here/00_baseline.sql" >/dev/null 2>&1
run -d "$database" -f "$here/01_seed.sql" >/dev/null 2>&1
run -d "$database" -f "$migration" >/dev/null 2>&1
echo "migration applied to ${database}"

# The migration must be safe to run twice.
run -d "$database" -f "$migration" >/dev/null 2>&1
echo "migration is re-runnable"

run -d "$database" -f "$here/02_scenarios.sql" 2>&1 >/dev/null | sed -n 's/.*NOTICE:  \(ok - .*\)/\1/p; /ERROR\|FAILED/p'
run -d "$database" -c "select 1" >/dev/null

"$here/03_concurrency.sh" "$database"

# Running the migration again on a database in use must change nothing:
# early finishes stay released, live holds stay live, nothing new expires.
fingerprint() { run -d "$database" -c "select md5(string_agg(id::text || status || coalesce(hold_expires_at::text, '-') || occupied_until::text || coalesce(buffer_minutes_override::text, '-'), ',' order by id)) from public.appointments where not (status in ('slot_held', 'pending_confirmation') and deposit_status <> 'paid' and hold_expires_at <= now() + interval '1 minute')"; }
before="$(fingerprint)"
run -d "$database" -f "$migration" >/dev/null 2>&1
after="$(fingerprint)"
[ "$before" = "$after" ] || { echo "FAILED: re-running the migration changed stored appointments"; exit 1; }
echo "ok - re-running the migration on a database in use changes no stored occupancy"
echo "scheduling database suite passed"
