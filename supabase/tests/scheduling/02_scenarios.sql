-- Local test harness ONLY. Database-level scheduling scenarios.
-- Run after 00_baseline.sql, 01_seed.sql and migration 202610020001.
-- Every check raises on failure, so psql -v ON_ERROR_STOP=1 exits non-zero.

create schema if not exists t;

create or replace function t.ok(p_condition boolean, p_label text) returns void language plpgsql as $$
begin
  if p_condition is not true then raise exception 'FAILED: %', p_label; end if;
  raise notice 'ok - %', p_label;
end;
$$;

-- Executes a statement and asserts that it fails with a message matching the pattern.
create or replace function t.fails(p_sql text, p_pattern text, p_label text) returns void language plpgsql as $$
declare v_message text;
begin
  begin
    execute p_sql;
  exception when others then
    v_message := sqlerrm;
  end;
  if v_message is null then raise exception 'FAILED (no error raised): %', p_label; end if;
  if v_message !~ p_pattern then raise exception 'FAILED (got "%"): %', v_message, p_label; end if;
  raise notice 'ok - % [%]', p_label, v_message;
end;
$$;

-- A Tuesday two weeks from now in the lounge timezone, plus a day offset.
create or replace function t.ts(p_day_offset integer, p_time text) returns timestamptz language sql stable as $$
  select ((date_trunc('week', now() at time zone 'America/New_York')::date + 15 + p_day_offset)::text || ' ' || p_time)::timestamp at time zone 'America/New_York';
$$;

create or replace function t.book(
  p_barber uuid, p_service uuid, p_start timestamptz, p_minutes integer, p_price integer,
  p_extra jsonb default '{}'::jsonb
) returns public.appointments language sql as $$
  select * from public.create_appointment_atomic(jsonb_build_object(
    'business_id', '00000000-0000-0000-0000-0000000000b1',
    'location_id', '00000000-0000-0000-0000-0000000000a1',
    'client_id', '00000000-0000-0000-0000-0000000000d1',
    'service_id', p_service,
    'barber_profile_id', p_barber,
    'public_reference', 'T-' || replace(gen_random_uuid()::text, '-', ''),
    'manage_token_hash', 'x',
    'service_name_snapshot', 'Test service',
    'service_price_snapshot_cents', p_price,
    'service_duration_snapshot_minutes', p_minutes,
    'barber_name_snapshot', 'Barber',
    'client_name_snapshot', 'Test Client',
    'client_email_snapshot', 'client@example.test',
    'starts_at', p_start,
    'ends_at', p_start + make_interval(mins => p_minutes),
    'status', 'pending_confirmation',
    'deposit_required_cents', p_price,
    'deposit_status', 'pending',
    'policy_version', 'test',
    'policy_accepted_at', now(),
    'idempotency_key', gen_random_uuid()
  ) || p_extra);
$$;

-- Simulates a verified Square payment followed by the webhook's confirmation call.
create or replace function t.pay(p_appointment uuid) returns public.appointments language plpgsql as $$
declare v_row public.appointments; v_order text := 'order-' || p_appointment::text;
begin
  select * into v_row from public.appointments where id = p_appointment;
  insert into public.square_payments (business_id, square_id, square_order_id, status, amount_cents, raw)
  values (v_row.business_id, 'pay-' || p_appointment::text, v_order, 'COMPLETED', v_row.service_price_snapshot_cents, '{"source_type":"CARD"}');
  insert into public.appointment_payment_links (business_id, appointment_id, purpose, amount_cents, square_payment_link_id, square_order_id, checkout_url, status, paid_at)
  values (v_row.business_id, p_appointment, 'deposit', v_row.service_price_snapshot_cents, 'pl-' || p_appointment::text, v_order, 'https://example.test', 'paid', now());
  update public.appointments set deposit_status = 'paid' where id = p_appointment;
  return jsonb_populate_record(null::public.appointments, public.confirm_paid_appointment(p_appointment)->'appointment');
end;
$$;

\set ruben '''00000000-0000-0000-0000-000000000c01'''
\set hommy '''00000000-0000-0000-0000-000000000c02'''
\set los '''00000000-0000-0000-0000-000000000c03'''
\set haircut '''00000000-0000-0000-0000-000000000501'''
\set kids '''00000000-0000-0000-0000-000000000502'''
\set senior '''00000000-0000-0000-0000-000000000503'''
\set beard '''00000000-0000-0000-0000-000000000504'''

\echo '--- S0 migration backfill'
select t.ok((select default_buffer_minutes from public.location_settings) = 5, 'buffer setting is exactly 5 minutes');
select t.ok(public.booking_buffer_minutes('00000000-0000-0000-0000-0000000000a1') = 5, 'booking_buffer_minutes() reads the setting');
select t.ok(public.booking_buffer_minutes(gen_random_uuid()) = 5, 'booking_buffer_minutes() defaults to 5');
select t.ok((select status from public.appointments where public_reference = 'LEGACY-STALE-1') = 'expired', 'abandoned checkout 1 was expired');
select t.ok((select status from public.appointments where public_reference = 'LEGACY-STALE-2') = 'expired', 'abandoned checkout 2 was expired');
select t.ok((select count(*) from public.appointment_status_history h join public.appointments a on a.id = h.appointment_id where a.public_reference like 'LEGACY-STALE-%' and h.to_status = 'expired') = 2, 'expiry wrote a history row for each');
select t.ok((select status from public.appointments where public_reference = 'LEGACY-PAID-LINK') = 'pending_confirmation', 'a hold with a paid link is never expired');
select t.ok((select status from public.appointments where public_reference = 'LEGACY-LIVE-HOLD') = 'pending_confirmation', 'a checkout inside its hold window is kept');
select t.ok((select hold_expires_at > now() from public.appointments where public_reference = 'LEGACY-LIVE-HOLD'), 'live hold has a future expiry');
select t.ok((select status = 'confirmed' and occupied_until = ends_at + interval '5 minutes' from public.appointments where public_reference = 'LEGACY-CONFIRMED'), 'paid appointment untouched; occupancy = end + 5 min');
select t.ok((select status = 'completed' and completed_at is null and occupied_until = ends_at + interval '5 minutes' from public.appointments where public_reference = 'LEGACY-COMPLETED'), 'historical completion keeps its scheduled end; no completion time is invented');
select t.ok((select count(*) from public.appointments) = 6, 'no appointment row was deleted');
select t.ok(exists (select 1 from pg_constraint where conname = 'appointments_no_buffered_overlap'), 'buffered exclusion constraint exists');
select t.ok(not exists (select 1 from pg_constraint where conname = 'appointments_no_active_overlap'), 'unbuffered constraint replaced');
select t.ok((select count(*) from public.family_booking_tiers where active) = 5, 'Family 1-5 tiers exist');
select t.ok((select not family_adult_eligible from public.services where slug = 'kids-haircut'), 'Kids Haircut is the child component, not an adult choice');
select t.ok((select bool_and(family_adult_eligible) from public.services where slug <> 'kids-haircut'), 'other services are adult-eligible');

\echo '--- S1 hold creation and exact 5-minute buffer'
do $$
declare a public.appointments;
begin
  a := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(0, '12:20'), 25, 1500);
  perform t.ok(a.status = 'pending_confirmation', 'website booking starts as an unpaid hold');
  perform t.ok(a.hold_expires_at between now() + interval '14 minutes' and now() + interval '16 minutes', 'hold expires 15 minutes after creation');
  perform t.ok(a.ends_at = t.ts(0, '12:45') and a.occupied_until = t.ts(0, '12:50'), 'appointment ending 12:45 occupies until 12:50');
end;
$$;
select t.fails(format($q$select t.book(%L, %L, t.ts(0, '12:30'), 25, 1500)$q$, :ruben, :beard), 'SLOT_CONFLICT', 'overlapping start is rejected');
select t.fails(format($q$select t.book(%L, %L, t.ts(0, '12:45'), 25, 1500)$q$, :ruben, :beard), 'SLOT_CONFLICT', '12:45 is inside the buffer');
select t.fails(format($q$select t.book(%L, %L, t.ts(0, '12:49'), 25, 1500)$q$, :ruben, :beard), 'SLOT_CONFLICT', '12:49 is inside the buffer');
select t.ok((t.book(:ruben, :beard, t.ts(0, '12:50'), 25, 1500)).id is not null, '12:50 is bookable: exactly 5 minutes after 12:45');
select t.fails(format($q$select t.book(%L, %L, t.ts(0, '11:51'), 25, 1500)$q$, :ruben, :beard), 'SLOT_CONFLICT', 'ending 12:16 leaves only 4 minutes before 12:20');
select t.ok((t.book(:ruben, :beard, t.ts(0, '11:50'), 25, 1500)).id is not null, 'ending 12:15 leaves exactly 5 minutes before 12:20: buffer is not doubled');
select t.ok((t.book(:hommy, :beard, t.ts(0, '12:30'), 25, 1500)).id is not null, 'another barber is unaffected');

\echo '--- S2 schedule, opening hours and timezone'
select t.fails(format($q$select t.book(%L, %L, t.ts(4, '10:00'), 60, 5000)$q$, :ruben, :haircut), 'APPOINTMENT_OUTSIDE_BARBER_SCHEDULE', 'Ruben has no Saturday schedule');
select t.fails(format($q$select t.book(%L, %L, t.ts(6, '10:00'), 60, 5000)$q$, :hommy, :haircut), 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS', 'the lounge is closed on Monday');
select t.fails(format($q$select t.book(%L, %L, t.ts(0, '07:45'), 60, 5000)$q$, :ruben, :haircut), 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS', 'before opening');
select t.fails(format($q$select t.book(%L, %L, t.ts(0, '20:05'), 60, 5000)$q$, :ruben, :haircut), 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS', 'the service must fit before closing');
select t.ok((t.book(:ruben, :haircut, t.ts(0, '20:00'), 60, 5000)).id is not null, 'ending exactly at closing is allowed: no buffer is required before close');
select t.ok((t.book(:ruben, :haircut, t.ts(0, '08:00'), 60, 5000)).id is not null, 'the first minute of the saved schedule is bookable');
select t.fails(format($q$select t.book(%L, %L, t.ts(3, '17:30'), 60, 5000)$q$, :los, :haircut), 'APPOINTMENT_OUTSIDE_BARBER_SCHEDULE', 'before the barber''s own start time');
select t.ok((t.book(:los, :haircut, t.ts(3, '18:00'), 60, 5000)).id is not null, 'inside the barber''s own evening schedule');

do $$
declare a public.appointments;
begin
  -- Sunday 2026-11-01 is the US fall-back date: 09:00 local is 14:00 UTC.
  if timestamptz '2026-11-01 14:00+00' > now() then
    a := t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000501', timestamptz '2026-11-01 14:00+00', 60, 5000);
    perform t.ok(a.id is not null, 'DST fall-back Sunday: 09:00 local (14:00 UTC) is the first bookable minute');
    perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000501', timestamptz '2026-11-01 13:00+00', 60, 5000)$q$, 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS', 'DST fall-back Sunday: 13:00 UTC is 08:00 local, before opening');
  end if;
end;
$$;

\echo '--- S3 merged schedule windows (weekly row plus date-specific addition)'
do $$
declare v_date date := (t.ts(1, '12:00') at time zone 'America/New_York')::date;
begin
  update public.barber_schedules set ends_at = '12:00' where barber_profile_id = '00000000-0000-0000-0000-000000000c03' and weekday = 5;
  update public.barber_schedules set starts_at = '08:00', ends_at = '12:00' where barber_profile_id = '00000000-0000-0000-0000-000000000c03' and weekday = 5;
  insert into public.barber_schedules (barber_profile_id, location_id, weekday, starts_at, ends_at, effective_from, effective_to)
  values ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-0000000000a1', 5, '12:00', '15:00', (t.ts(3, '12:00') at time zone 'America/New_York')::date, (t.ts(3, '12:00') at time zone 'America/New_York')::date);
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000501', t.ts(3, '11:30'), 60, 5000)).id is not null, 'an appointment may span two touching schedule rows');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000501', t.ts(3, '14:30'), 60, 5000)$q$, 'APPOINTMENT_OUTSIDE_BARBER_SCHEDULE', 'but not past the end of the merged window');
end;
$$;

\echo '--- S4 barber unavailability and breaks'
do $$
declare v_off uuid;
begin
  insert into public.barber_time_off (barber_profile_id, location_id, starts_at, ends_at, status, availability_kind)
  values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(1, '14:00'), t.ts(1, '16:00'), 'approved', 'unavailable') returning id into v_off;
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(1, '15:00'), 60, 5000)$q$, 'BARBER_UNAVAILABLE', 'approved unavailable time blocks booking');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(1, '13:30'), 60, 5000)$q$, 'BARBER_UNAVAILABLE', 'an appointment may not run into unavailable time');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(1, '13:00'), 60, 5000)).id is not null, 'ending exactly when unavailable time starts is allowed');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(1, '16:00'), 60, 5000)).id is not null, 'starting exactly when unavailable time ends is allowed');

  insert into public.barber_time_off (barber_profile_id, location_id, starts_at, ends_at, status, availability_kind)
  values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(1, '18:00'), t.ts(1, '19:00'), 'requested', 'unavailable'),
         ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(1, '18:00'), t.ts(1, '19:00'), 'cancelled', 'unavailable'),
         ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(1, '18:00'), t.ts(1, '19:00'), 'declined', 'unavailable');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(1, '18:00'), 60, 5000)).id is not null, 'requested, cancelled and declined time off never block');

  update public.barber_time_off set status = 'cancelled' where id = v_off;
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(1, '14:30'), 25, 1500)).id is not null, 'removing unavailability reopens the time');

  insert into public.barber_breaks (barber_profile_id, location_id, starts_at, ends_at, status)
  values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(1, '10:00'), t.ts(1, '10:30'), 'scheduled');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(1, '10:15'), 25, 1500)$q$, 'BARBER_ON_BREAK', 'a scheduled break blocks booking');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(1, '10:30'), 25, 1500)).id is not null, 'the minute a break ends is bookable');
end;
$$;

\echo '--- S5 checkout holds: expiry, payment, late payment'
do $$
declare a public.appointments; b public.appointments; c public.appointments;
begin
  a := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '09:00'), 60, 5000);
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '09:00'), 60, 5000)$q$, 'SLOT_CONFLICT', 'a live checkout hold blocks the slot');

  -- the customer abandons checkout: the hold window passes
  update public.appointments set hold_expires_at = now() - interval '1 second' where id = a.id;
  b := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '09:00'), 60, 5000);
  perform t.ok(b.id is not null, 'an expired hold releases its slot immediately, without waiting for a job');
  perform t.ok((select status from public.appointments where id = a.id) = 'expired', 'the abandoned checkout is marked expired');
  perform t.ok(exists (select 1 from public.appointment_status_history where appointment_id = a.id and to_status = 'expired'), 'with a history row');

  -- late payment for the expired hold whose slot was taken
  insert into public.square_payments (business_id, square_id, square_order_id, status, amount_cents, raw) values (a.business_id, 'late-' || a.id, 'late-order-' || a.id, 'COMPLETED', 5000, '{"source_type":"CARD"}');
  insert into public.appointment_payment_links (business_id, appointment_id, purpose, amount_cents, square_payment_link_id, square_order_id, checkout_url, status) values (a.business_id, a.id, 'deposit', 5000, 'late-pl-' || a.id, 'late-order-' || a.id, 'https://example.test', 'paid');
  update public.appointments set deposit_status = 'paid' where id = a.id;
  perform t.fails(format('select public.confirm_paid_appointment(%L)', a.id), 'SLOT_CONFLICT', 'a late payment cannot double-book a slot that was re-sold');
  perform t.ok((select status from public.appointments where id = a.id) = 'expired', 'the late-paid appointment stays expired for staff reconciliation');

  -- normal payment promotes the hold and it then never expires
  b := t.pay(b.id);
  perform t.ok(b.status = 'confirmed' and b.deposit_status = 'paid', 'verified payment confirms the appointment');
  perform t.ok((public.confirm_paid_appointment(b.id)->>'promoted')::boolean = false, 'a duplicate payment webhook reports promoted=false, so confirmations are sent once');
  update public.appointments set hold_expires_at = now() - interval '1 hour' where id = b.id;
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '09:30'), 60, 5000)$q$, 'SLOT_CONFLICT', 'a paid appointment keeps blocking regardless of the old hold window');

  -- late payment for an expired hold whose slot is still free: restored
  c := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '11:00'), 60, 5000);
  update public.appointments set hold_expires_at = now() - interval '1 minute' where id = c.id;
  perform t.ok((select count(*) from public.expire_unpaid_appointment_holds(50)) >= 1, 'the expiry job expires stale holds');
  perform t.ok((select status from public.appointments where id = c.id) = 'expired', 'job marked the hold expired');
  c := t.pay(c.id);
  perform t.ok(c.status = 'confirmed', 'a late payment restores the booking when its time is still free');
  perform t.ok(exists (select 1 from public.appointment_status_history where appointment_id = c.id and from_status = 'expired' and to_status = 'confirmed'), 'restoration is recorded in history');

  perform t.ok((select count(*) from public.expire_unpaid_appointment_holds(50)) = 0, 'the expiry job is idempotent');
  perform t.fails(format('update public.appointments set status = %L where id = %L', 'confirmed', a.id), 'SLOT_CONFLICT|INVALID_APPOINTMENT_STATUS_TRANSITION', 'a direct status flip cannot bypass the guard');
end;
$$;

do $$
declare a public.appointments;
begin
  -- an unpaid appointment cannot be confirmed just by calling the RPC
  a := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '13:00'), 60, 5000);
  perform t.ok((public.confirm_paid_appointment(a.id)->>'promoted')::boolean = false and (select status from public.appointments where id = a.id) = 'pending_confirmation', 'confirmation without verified full payment stays pending and reports promoted=false');
  perform t.pay(a.id);
  update public.appointments set status = 'cancelled_by_business' where id = a.id;
  perform t.ok(public.confirm_paid_appointment(a.id)->'appointment'->>'status' = 'cancelled_by_business', 'confirmation never resurrects a cancelled appointment');
end;
$$;

\echo '--- S5b returning to pay after the hold window'
do $$
declare a public.appointments; b public.appointments; r public.appointments;
begin
  a := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(2, '17:00'), 25, 1500);
  r := public.renew_appointment_hold(a.id);
  perform t.ok(r.hold_expires_at = a.hold_expires_at, 'a live hold is not extended by asking again');

  update public.appointments set hold_expires_at = now() - interval '5 minutes' where id = a.id;
  r := public.renew_appointment_hold(a.id);
  perform t.ok(r.status = 'pending_confirmation' and r.hold_expires_at > now() + interval '14 minutes', 'a lapsed hold is renewed when its time is still free');

  update public.appointments set hold_expires_at = now() - interval '5 minutes' where id = a.id;
  b := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(2, '17:10'), 25, 1500);
  r := public.renew_appointment_hold(a.id);
  perform t.ok(r.status = 'expired', 'a lapsed hold whose time was taken is expired instead of renewed');


  -- the barber became unavailable while the checkout sat abandoned
  a := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(2, '19:30'), 25, 1500);
  update public.appointments set hold_expires_at = now() - interval '5 minutes' where id = a.id;
  insert into public.barber_time_off (barber_profile_id, location_id, starts_at, ends_at, status, availability_kind)
  values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(2, '19:00'), t.ts(2, '21:00'), 'approved', 'unavailable');
  r := public.renew_appointment_hold(a.id);
  perform t.ok(r.status = 'expired' and exists (select 1 from public.appointment_status_history where appointment_id = a.id and reason like '%no longer free%'), 'a lapsed hold inside newly unavailable time is expired, with a history row');
end;
$$;

\echo '--- S6 lifecycle transitions are not re-validated as new placements'
do $$
declare a public.appointments;
begin
  a := t.pay((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(2, '15:00'), 60, 5000)).id);
  insert into public.barber_time_off (barber_profile_id, location_id, starts_at, ends_at, status, availability_kind)
  values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(2, '15:00'), t.ts(2, '16:00'), 'approved', 'unavailable');
  update public.appointments set status = 'checked_in' where id = a.id;
  update public.appointments set status = 'in_service' where id = a.id;
  perform t.ok((select status from public.appointments where id = a.id) = 'in_service', 'check-in and start-service work even if rules changed after booking');
  perform t.fails(format('update public.appointments set status = %L where id = %L', 'pending_confirmation', a.id), 'INVALID_APPOINTMENT_STATUS_TRANSITION', 'invalid transitions are still rejected');
end;
$$;

\echo '--- S7 rescheduling'
do $$
declare a public.appointments; other public.appointments; moved public.appointments; again public.appointments; v_updated timestamptz;
begin
  a := t.pay((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(7, '12:00'), 60, 5000)).id);
  other := t.pay((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(7, '15:00'), 60, 5000)).id);

  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, %L, null, %L, %L)', a.id, t.ts(7, '14:30'), t.ts(7, '15:30'), 'owner', 'x'), 'SLOT_CONFLICT', 'moving onto another appointment is rejected');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, %L, null, %L, %L)', a.id, t.ts(7, '14:00'), t.ts(7, '15:00'), 'owner', 'x'), 'SLOT_CONFLICT', 'moving inside the buffer of another appointment is rejected');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, %L, null, %L, %L)', a.id, t.ts(7, '20:30'), t.ts(7, '21:30'), 'owner', 'x'), 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS', 'moving past closing is rejected');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, %L, null, %L, %L)', a.id, t.ts(11, '10:00'), t.ts(11, '11:00'), 'owner', 'x'), 'APPOINTMENT_OUTSIDE_BARBER_SCHEDULE', 'moving to a day the barber does not work is rejected');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, %L, null, %L, %L)', a.id, now() - interval '2 hours', now() - interval '1 hour', 'owner', 'x'), 'RESCHEDULE_IN_PAST', 'moving into the past is rejected');
  perform t.ok((select starts_at = t.ts(7, '12:00') and reschedule_count = 0 from public.appointments where id = a.id), 'a rejected move leaves the appointment exactly where it was');

  moved := public.reschedule_appointment_atomic(a.id, t.ts(7, '12:15'), t.ts(7, '13:15'), null, 'owner', 'nudge');
  perform t.ok(moved.starts_at = t.ts(7, '12:15'), 'an appointment can move to a time that overlaps its own old slot');

  moved := public.reschedule_appointment_atomic(a.id, t.ts(8, '09:00'), null, null, 'owner', 'Moved to Wednesday');
  perform t.ok(moved.starts_at = t.ts(8, '09:00') and moved.ends_at = t.ts(8, '10:00') and moved.status = 'confirmed', 'moved to another day; duration preserved even with no end supplied');
  perform t.ok(moved.reschedule_count = 2 and moved.occupied_until = t.ts(8, '10:05'), 'reschedule counter and occupancy updated');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(7, '12:00'), 60, 5000)).id is not null, 'the old slot is bookable again');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(8, '09:30'), 60, 5000)$q$, 'SLOT_CONFLICT', 'the new slot is blocked');

  select updated_at into v_updated from public.appointments where id = a.id;
  again := public.reschedule_appointment_atomic(a.id, t.ts(8, '09:00'), t.ts(8, '10:00'), null, 'owner', 'retry');
  perform t.ok(again.reschedule_count = 2 and again.updated_at = v_updated, 'repeating the same move is a no-op (idempotent retry)');
  perform t.ok((select count(*) from public.appointment_status_history where appointment_id = a.id and metadata ? 'previous_starts_at') = 2, 'each real move wrote exactly one history row');
  perform t.ok((select count(*) from public.audit_logs where resource_id = a.id::text and action = 'booking.rescheduled' and before_data ? 'starts_at' and after_data ? 'starts_at') = 2, 'each real move wrote an audit row with before and after values');

  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, null, null, %L, %L)', (select id from public.appointments where public_reference = 'LEGACY-COMPLETED'), t.ts(8, '18:00'), 'owner', 'x'), 'APPOINTMENT_NOT_RESCHEDULABLE', 'a completed appointment cannot be moved');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, null, null, %L, %L)', gen_random_uuid(), t.ts(8, '18:00'), 'owner', 'x'), 'APPOINTMENT_NOT_FOUND', 'unknown appointment');
end;
$$;

\echo '--- S8 reassigning to another barber'
do $$
declare a public.appointments; moved public.appointments;
begin
  a := t.pay((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000503', t.ts(9, '10:00'), 35, 4000)).id);
  perform t.pay((t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000501', t.ts(9, '10:00'), 60, 5000)).id);

  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, null, null, %L, %L, %L)', a.id, t.ts(9, '10:00'), 'owner', 'x', '00000000-0000-0000-0000-000000000c02'), 'SLOT_CONFLICT', 'cannot reassign onto a busy barber');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, null, null, %L, %L, %L)', a.id, t.ts(10, '18:00'), 'owner', 'x', '00000000-0000-0000-0000-000000000c03'), 'BARBER_SERVICE_NOT_ELIGIBLE', 'cannot reassign to a barber who does not offer the service');
  moved := public.reschedule_appointment_atomic(a.id, t.ts(9, '11:05'), null, null, 'owner', 'Reassigned', '00000000-0000-0000-0000-000000000c02');
  perform t.ok(moved.barber_profile_id = '00000000-0000-0000-0000-000000000c02' and moved.barber_name_snapshot = 'Hommy Rivera' and moved.starts_at = t.ts(9, '11:05'), 'moved to another eligible barber at a valid time');
  perform t.ok((select count(*) from public.appointment_assignments where appointment_id = a.id and active) = 1 and (select barber_profile_id from public.appointment_assignments where appointment_id = a.id and active) = '00000000-0000-0000-0000-000000000c02', 'assignment history updated');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000503', t.ts(9, '10:00'), 35, 4000)).id is not null, 'the original barber''s time is free again');
end;
$$;

\echo '--- S9 family bookings'
do $$
declare f public.appointments; moved public.appointments; v_items integer;
begin
  -- Family 2 with Haircut: 60 + 2*40 + 2*5 = 150 minutes, 5000 + 2*3500 = 12000 cents
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:00'), 140, 12000, '{"booking_kind":"family","family_children_count":2}')$q$, 'BOOKING_CATALOG_CHANGED', 'a family duration that disagrees with the catalog is refused');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:00'), 150, 11000, '{"booking_kind":"family","family_children_count":2}')$q$, 'BOOKING_CATALOG_CHANGED', 'a family price that disagrees with the catalog is refused');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:00'), 150, 12000, '{"booking_kind":"family","family_children_count":6}')$q$, 'INVALID_FAMILY_BOOKING', 'at most five children');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:00'), 150, 12000, '{"booking_kind":"family","family_children_count":0}')$q$, 'INVALID_FAMILY_BOOKING', 'at least one child');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000502', t.ts(14, '09:00'), 125, 10500, '{"booking_kind":"family","family_children_count":2}')$q$, 'INVALID_FAMILY_BOOKING', 'Kids Haircut cannot be the adult service');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000501', t.ts(17, '18:00'), 150, 12000, '{"booking_kind":"family","family_children_count":2}')$q$, 'BARBER_SERVICE_NOT_ELIGIBLE', 'the barber must offer Kids Haircut too');

  f := t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:00'), 150, 12000, '{"booking_kind":"family","family_children_count":2,"service_name_snapshot":"Family 2: Haircut + 2 × Kids Haircut"}');
  perform t.ok(f.booking_kind = 'family' and f.party_size = 3, 'Family 2 is one appointment for three people');
  perform t.ok(f.ends_at = t.ts(14, '11:30') and f.service_duration_snapshot_minutes = 150, 'the whole 150-minute block is reserved');
  perform t.ok(f.service_price_snapshot_cents = 12000 and f.deposit_required_cents = 12000, 'total price = adult + 2 x Kids Haircut, all due as prepayment');
  select count(*) into v_items from public.appointment_service_items where appointment_id = f.id;
  perform t.ok(v_items = 3, 'three itemized service components');
  perform t.ok((select array_agg(role || ':' || offset_minutes || ':' || duration_snapshot_minutes || ':' || price_snapshot_cents order by sequence) from public.appointment_service_items where appointment_id = f.id) = array['adult:0:60:5000', 'child:65:40:3500', 'child:110:40:3500'], 'members are consecutive with a 5-minute changeover; prices come from the catalog');
  perform t.ok((select sum(price_snapshot_cents) from public.appointment_service_items where appointment_id = f.id) = f.service_price_snapshot_cents, 'itemized prices add up to the charged total');
  perform t.ok(exists (select 1 from public.audit_logs where resource_id = f.id::text and action = 'booking.family_created'), 'family creation is audited');

  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(14, '10:10'), 25, 1500)$q$, 'SLOT_CONFLICT', 'nobody else can book inside the family block');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(14, '11:30'), 25, 1500)$q$, 'SLOT_CONFLICT', 'the buffer applies after the last child');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000504', t.ts(14, '11:35'), 25, 1500)).id is not null, 'the next client may start 5 minutes after the family');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:30'), 150, 12000, '{"booking_kind":"family","family_children_count":2}')$q$, 'SLOT_CONFLICT', 'a second family cannot cross an existing appointment');

  insert into public.barber_time_off (barber_profile_id, location_id, starts_at, ends_at, status, availability_kind)
  values ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000a1', t.ts(15, '10:00'), t.ts(15, '11:00'), 'approved', 'unavailable');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(15, '08:00'), 150, 12000, '{"booking_kind":"family","family_children_count":2}')$q$, 'BARBER_UNAVAILABLE', 'a family cannot cross unavailable time');
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(15, '18:35'), 150, 12000, '{"booking_kind":"family","family_children_count":2}')$q$, 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS', 'the last child must finish by closing time');

  -- Family 1..5 with Senior Haircut (35 min, $40)
  for i in 1..5 loop
    f := t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000503', t.ts(34 + i, '08:00'), 35 + i * 45, 4000 + i * 3500, jsonb_build_object('booking_kind', 'family', 'family_children_count', i));
    perform t.ok(f.party_size = i + 1 and (select count(*) from public.appointment_service_items where appointment_id = f.id and role = 'child') = i, format('Family %s: %s children, %s minutes, %s cents', i, i, 35 + i * 45, 4000 + i * 3500));
  end loop;

  -- reschedule: the whole family moves, components and total unchanged
  f := t.pay((select id from public.appointments where booking_kind = 'family' and barber_profile_id = '00000000-0000-0000-0000-000000000c01' limit 1));
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, null, null, %L, %L)', f.id, t.ts(15, '09:00'), 'owner', 'x'), 'BARBER_UNAVAILABLE', 'a family cannot be moved across unavailable time');
  perform t.fails(format('select public.reschedule_appointment_atomic(%L, %L, null, null, %L, %L, %L)', f.id, t.ts(17, '18:00'), 'owner', 'x', '00000000-0000-0000-0000-000000000c03'), 'BARBER_SERVICE_NOT_ELIGIBLE', 'a family cannot be reassigned to a barber who does not offer every component');
  moved := public.reschedule_appointment_atomic(f.id, t.ts(15, '11:00'), t.ts(15, '12:00'), null, 'owner', 'Family moved');
  perform t.ok(moved.starts_at = t.ts(15, '11:00') and moved.ends_at = t.ts(15, '13:30'), 'the family moved as one 150-minute block even though a 60-minute end was supplied');
  perform t.ok((select count(*) from public.appointment_service_items where appointment_id = f.id) = 3 and moved.service_price_snapshot_cents = 12000 and moved.party_size = 3, 'every family member, the price and the payment linkage are preserved');
  perform t.ok((t.book('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000501', t.ts(14, '09:00'), 60, 5000)).id is not null, 'the family''s old time is free again');
end;
$$;

\echo '--- S10 finishing early'
do $$
declare
  v_tz text;
  v_loc uuid := '00000000-0000-0000-0000-0000000000a2';
  v_barber uuid := '00000000-0000-0000-0000-000000000c09';
  a public.appointments; done public.appointments; again public.appointments; future public.appointments;
  v_start timestamptz := date_trunc('minute', now()) - interval '30 minutes';
  v_history integer;
begin
  -- A location that is open around "now" so an in-progress appointment can exist regardless of when the suite runs.
  select name into v_tz from (values ('Etc/GMT+11'), ('Etc/GMT+6'), ('UTC'), ('Etc/GMT-6'), ('Etc/GMT-11')) z(name)
  where extract(hour from now() at time zone name) between 8 and 15 limit 1;
  insert into public.locations (id, business_id, name, slug, timezone) values (v_loc, '00000000-0000-0000-0000-0000000000b1', 'Clock test location', 'clock-test', v_tz);
  insert into public.location_settings (location_id, default_buffer_minutes) values (v_loc, 5);
  insert into public.business_hours (location_id, weekday, opens_at, closes_at, closed) select v_loc, d, '00:00', '23:59', false from generate_series(0, 6) d;
  insert into public.barber_profiles (id, business_id, slug, display_name, active, demo, status) values (v_barber, '00000000-0000-0000-0000-0000000000b1', 'clock-test-barber', 'Clock Test', true, false, 'published');
  insert into public.barber_profile_services (barber_profile_id, service_id) values (v_barber, '00000000-0000-0000-0000-000000000501'), (v_barber, '00000000-0000-0000-0000-000000000504');
  insert into public.barber_schedules (barber_profile_id, location_id, weekday, starts_at, ends_at, effective_from) select v_barber, v_loc, d, '00:00', '23:59', date '2026-01-01' from generate_series(0, 6) d;

  -- 60-minute appointment that started 30 minutes ago
  a := public.create_appointment_atomic(jsonb_build_object(
    'business_id', '00000000-0000-0000-0000-0000000000b1', 'location_id', v_loc, 'client_id', '00000000-0000-0000-0000-0000000000d1',
    'service_id', '00000000-0000-0000-0000-000000000501', 'barber_profile_id', v_barber, 'public_reference', 'T-FINISH', 'manage_token_hash', 'x',
    'service_name_snapshot', 'Haircut', 'service_price_snapshot_cents', 5000, 'service_duration_snapshot_minutes', 60,
    'barber_name_snapshot', 'Clock Test', 'client_name_snapshot', 'Test Client', 'starts_at', v_start, 'ends_at', v_start + interval '60 minutes',
    'status', 'pending_confirmation', 'deposit_required_cents', 5000, 'deposit_status', 'pending', 'policy_version', 'test', 'policy_accepted_at', now(), 'idempotency_key', gen_random_uuid()));
  a := t.pay(a.id);
  perform t.ok(a.status = 'confirmed' and a.occupied_until = v_start + interval '65 minutes', 'before Finish the full reservation plus buffer is occupied');
  perform t.fails(format($q$select public.create_appointment_atomic(jsonb_build_object('business_id', '00000000-0000-0000-0000-0000000000b1', 'location_id', %L, 'client_id', '00000000-0000-0000-0000-0000000000d1', 'service_id', '00000000-0000-0000-0000-000000000504', 'barber_profile_id', %L, 'public_reference', 'T-BEFORE', 'manage_token_hash', 'x', 'service_name_snapshot', 'Beard', 'service_price_snapshot_cents', 1500, 'service_duration_snapshot_minutes', 20, 'barber_name_snapshot', 'Clock Test', 'client_name_snapshot', 'Test Client', 'starts_at', %L, 'ends_at', %L, 'status', 'pending_confirmation', 'deposit_required_cents', 1500, 'deposit_status', 'pending', 'policy_version', 'test', 'policy_accepted_at', now(), 'idempotency_key', gen_random_uuid()))$q$, v_loc, v_barber, now() + interval '6 minutes', now() + interval '26 minutes'), 'SLOT_CONFLICT', 'before Finish the remaining reserved time is not bookable');

  done := public.complete_appointment_atomic(a.id, null, 'barber', 'Finished early');
  perform t.ok(done.status = 'completed' and done.completed_at = now(), 'Finish records the actual completion time');
  perform t.ok(done.starts_at = a.starts_at and done.ends_at = a.ends_at and done.service_duration_snapshot_minutes = 60 and done.service_price_snapshot_cents = 5000 and done.deposit_status = 'paid', 'scheduled duration, price and payment are preserved');
  perform t.ok(done.occupied_until = now() + interval '5 minutes', 'the barber is occupied only until completion + 5 minutes');
  select count(*) into v_history from public.appointment_status_history where appointment_id = a.id and to_status = 'completed';
  perform t.ok(v_history = 1 and (select (metadata->>'released_minutes')::integer between 28 and 30 from public.appointment_status_history where appointment_id = a.id and to_status = 'completed'), 'history records the released minutes');
  perform t.ok(exists (select 1 from public.audit_logs where resource_id = a.id::text and action = 'booking.completed' and after_data ? 'completed_at'), 'Finish is audited');

  again := public.complete_appointment_atomic(a.id, null, 'barber', 'double click');
  perform t.ok(again.completed_at = done.completed_at and (select count(*) from public.appointment_status_history where appointment_id = a.id and to_status = 'completed') = 1, 'a second Finish click changes nothing');

  perform t.fails(format($q$select public.create_appointment_atomic(jsonb_build_object('business_id', '00000000-0000-0000-0000-0000000000b1', 'location_id', %L, 'client_id', '00000000-0000-0000-0000-0000000000d1', 'service_id', '00000000-0000-0000-0000-000000000504', 'barber_profile_id', %L, 'public_reference', 'T-AFTER-4', 'manage_token_hash', 'x', 'service_name_snapshot', 'Beard', 'service_price_snapshot_cents', 1500, 'service_duration_snapshot_minutes', 20, 'barber_name_snapshot', 'Clock Test', 'client_name_snapshot', 'Test Client', 'starts_at', %L, 'ends_at', %L, 'status', 'pending_confirmation', 'deposit_required_cents', 1500, 'deposit_status', 'pending', 'policy_version', 'test', 'policy_accepted_at', now(), 'idempotency_key', gen_random_uuid()))$q$, v_loc, v_barber, now() + interval '4 minutes', now() + interval '24 minutes'), 'SLOT_CONFLICT', 'four minutes after an early finish is still inside the buffer');
  future := public.create_appointment_atomic(jsonb_build_object('business_id', '00000000-0000-0000-0000-0000000000b1', 'location_id', v_loc, 'client_id', '00000000-0000-0000-0000-0000000000d1', 'service_id', '00000000-0000-0000-0000-000000000504', 'barber_profile_id', v_barber, 'public_reference', 'T-AFTER-5', 'manage_token_hash', 'x', 'service_name_snapshot', 'Beard', 'service_price_snapshot_cents', 1500, 'service_duration_snapshot_minutes', 20, 'barber_name_snapshot', 'Clock Test', 'client_name_snapshot', 'Test Client', 'starts_at', now() + interval '5 minutes', 'ends_at', now() + interval '25 minutes', 'status', 'pending_confirmation', 'deposit_required_cents', 1500, 'deposit_status', 'pending', 'policy_version', 'test', 'policy_accepted_at', now(), 'idempotency_key', gen_random_uuid()));
  perform t.ok(future.id is not null, 'five minutes after an early finish the released time is bookable');

  perform t.fails(format('select public.complete_appointment_atomic(%L, null, %L)', (select id from public.appointments where public_reference = 'LEGACY-CONFIRMED'), 'barber'), 'APPOINTMENT_NOT_STARTED', 'an appointment far in the future cannot be finished by accident');
  perform t.fails(format('select public.complete_appointment_atomic(%L, null, %L)', (select id from public.appointments where status = 'expired' limit 1), 'barber'), 'APPOINTMENT_NOT_FINISHABLE', 'only operational appointments can be finished');
end;
$$;

\echo '--- S11 queue synchronisation on Finish'
do $$
declare a public.appointments; q uuid;
begin
  a := (select x from public.appointments x where public_reference = 'T-AFTER-5');
  a := t.pay(a.id);
  insert into public.queue_entries (business_id, appointment_id, status) values (a.business_id, a.id, 'checked_in') returning id into q;
  update public.appointments set status = 'checked_in' where id = a.id;
  a := public.complete_appointment_atomic(a.id, null, 'owner');
  perform t.ok(a.status = 'completed' and (select status from public.queue_entries where id = q) = 'completed', 'finishing from checked-in also completes the linked queue entry');
end;
$$;

\echo '--- S12 idempotent creation, buffer setting changes, realtime, catalog'
do $$
declare v_key uuid := gen_random_uuid(); a public.appointments; b public.appointments; v_before bigint;
begin
  a := t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(21, '09:00'), 25, 1500, jsonb_build_object('idempotency_key', v_key));
  b := t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(21, '09:00'), 25, 1500, jsonb_build_object('idempotency_key', v_key));
  perform t.ok(a.id = b.id and (select count(*) from public.appointments where idempotency_key = v_key) = 1, 'a retried submission returns the same appointment instead of creating a second one');

  perform t.pay(a.id);
  perform t.pay((t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(21, '09:30'), 25, 1500)).id);
  perform t.fails($q$update public.location_settings set default_buffer_minutes = 10 where location_id = '00000000-0000-0000-0000-0000000000a1'$q$, 'conflicting key value violates exclusion constraint', 'the buffer cannot be raised while confirmed appointments are closer than the new value');
  perform t.ok((select default_buffer_minutes from public.location_settings where location_id = '00000000-0000-0000-0000-0000000000a1') = 5, 'buffer setting unchanged after the refused change');

  select count(*) into v_before from realtime.sent where topic = 'booking-availability:northfield';
  insert into public.barber_time_off (barber_profile_id, location_id, starts_at, ends_at, status) values ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-0000000000a1', t.ts(22, '09:00'), t.ts(22, '10:00'), 'approved');
  perform t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(22, '12:00'), 25, 1500);
  perform t.ok((select count(*) from realtime.sent where topic = 'booking-availability:northfield' and event = 'availability_changed') >= v_before + 2, 'availability changes are broadcast to open calendars and booking pages');
  perform t.ok(not exists (select 1 from realtime.sent where topic = 'booking-availability:northfield' and payload::text ~* 'client|email|phone'), 'the broadcast carries no personal data');
end;
$$;

select t.ok(jsonb_array_length(public.get_public_booking_catalog()->'family'->'tiers') = 5, 'public catalog lists Family 1-5');
select t.ok((public.get_public_booking_catalog()->'family'->'tiers'->0->>'child_service_id') = '00000000-0000-0000-0000-000000000502', 'family child component is the live Kids Haircut service');
select t.ok((public.get_public_booking_catalog()->'family'->>'buffer_minutes')::integer = 5, 'catalog reports the 5-minute changeover');
select t.ok((select bool_and((s->>'family_adult_eligible')::boolean = (s->>'slug' <> 'kids-haircut')) from jsonb_array_elements(public.get_public_booking_catalog()->'services') s), 'catalog marks adult-eligible services');

\echo '--- S13 the exclusion constraint is an independent backstop'
do $$
declare a public.appointments;
begin
  a := t.pay((t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(23, '09:00'), 25, 1500)).id);
  -- Bypass the trigger guard entirely; the constraint alone must still refuse a buffer violation.
  alter table public.appointments disable trigger trg_enforce_appointment_barber_availability;
  perform t.fails($q$select t.book('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000504', t.ts(23, '09:27'), 25, 1500)$q$, 'SLOT_CONFLICT', 'constraint alone rejects a start inside the buffer');
  alter table public.appointments enable trigger trg_enforce_appointment_barber_availability;
end;
$$;

\echo 'ALL DATABASE SCENARIOS PASSED'
