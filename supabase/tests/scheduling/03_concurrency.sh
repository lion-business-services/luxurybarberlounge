#!/usr/bin/env bash
# Races many simultaneous bookings for the same barber and time and asserts
# that exactly one wins. Run through run.sh.
set -euo pipefail
database="$1"
run() { psql -v ON_ERROR_STOP=0 -q -At -d "$database" "$@"; }

book() {
  # $1 = minutes offset from 09:00 on the race day, $2 = hold transaction open seconds
  run <<SQL 2>&1
begin;
select 'BOOKED' from t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(28, '09:00') + make_interval(mins => $1), 25, 1500);
select pg_sleep($2);
commit;
SQL
}

tmp="$(mktemp -d)"
for i in $(seq 1 12); do book 0 0.4 >"$tmp/same-$i" & done
wait
won="$(cat "$tmp"/same-* | grep -c '^BOOKED$' || true)"
lost="$(cat "$tmp"/same-* | grep -c 'SLOT_CONFLICT' || true)"
[ "$won" = "1" ] && [ "$lost" = "11" ] || { echo "FAILED: 12 simultaneous bookings for one slot -> $won won, $lost conflicts"; cat "$tmp"/same-*; exit 1; }
echo "ok - 12 simultaneous requests for the same slot: exactly 1 booked, 11 rejected"

# Staggered starts 10 minutes apart: each 25-minute service needs 30 minutes, so only non-conflicting ones may win.
for i in $(seq 0 11); do book $((120 + i * 10)) 0.3 >"$tmp/stagger-$i" & done
wait
overlaps="$(run -c "select count(*) from public.appointments a join public.appointments b on a.barber_profile_id = b.barber_profile_id and a.id < b.id and a.status in ('pending_confirmation','confirmed') and b.status in ('pending_confirmation','confirmed') and a.starts_at < b.occupied_until and b.starts_at < a.occupied_until")"
[ "$overlaps" = "0" ] || { echo "FAILED: $overlaps overlapping or under-buffered appointment pairs exist after the race"; exit 1; }
booked="$(cat "$tmp"/stagger-* | grep -c '^BOOKED$' || true)"
# Depending on which requests win, 3 or 4 of the 12 fit; never more, never fewer.
[ "$booked" -ge 3 ] && [ "$booked" -le 4 ] || { echo "FAILED: staggered race booked $booked (expected 3 or 4)"; exit 1; }
echo "ok - staggered race: $booked non-conflicting bookings, 0 overlapping or under-buffered pairs in the whole database"

# A reschedule racing a new booking for the same destination.
target="$(run -c "select (t.pay((t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(29, '09:00'), 25, 1500)).id)).id")"
( run -c "begin; select 'MOVED' from public.reschedule_appointment_atomic('$target', t.ts(29, '14:00'), null, null, 'owner', 'race'); select pg_sleep(0.4); commit;" >"$tmp/move" 2>&1 ) &
( sleep 0.1; run -c "select 'BOOKED' from t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(29, '14:10'), 25, 1500)" >"$tmp/book" 2>&1 ) &
wait
winners="$(cat "$tmp/move" "$tmp/book" | grep -c '^MOVED$\|^BOOKED$' || true)"
[ "$winners" = "1" ] || { echo "FAILED: reschedule vs booking race produced $winners winners"; cat "$tmp/move" "$tmp/book"; exit 1; }
echo "ok - a reschedule racing a new booking for the same time: exactly 1 succeeds"
rm -rf "$tmp"
