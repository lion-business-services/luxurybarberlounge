-- Luxury Barber Lounge: scheduling single source of truth.
--
-- Supabase is the scheduling source of truth; Square is the payment source of
-- truth. This migration makes Postgres the final authority for every booking
-- rule, mirroring src/lib/booking/rules.ts and src/lib/booking/slots.ts:
--
--   * one buffer value (location_settings.default_buffer_minutes = 5), applied
--     once between neighbouring appointments, enforced by trigger AND by an
--     exclusion constraint;
--   * unpaid checkout holds expire after 15 minutes and stop blocking at once;
--   * finishing early stores completed_at and releases the unused time while
--     the scheduled start/end stay untouched for history and reporting;
--   * rescheduling, reassigning, finishing and payment confirmation are atomic
--     RPCs with audit history;
--   * family bookings are ONE appointment with itemized service components,
--     priced and timed from the live catalog inside the database.
--
-- Additive and backward compatible: the previously deployed application keeps
-- working against this schema. No appointment, client, payment or history row
-- is deleted.
begin;

-- Fail fast instead of queueing behind live traffic. If a lock cannot be
-- taken the whole migration rolls back untouched and can simply be re-run.
set local lock_timeout = '15s';

-- Created first on purpose: the payment-link trigger locks payment links and
-- then appointments, so this migration takes its locks in the same order.
create index if not exists idx_appointment_payment_links_open
  on public.appointment_payment_links (appointment_id)
  where status = 'created';

-- ---------------------------------------------------------------------------
-- 1. Authoritative rule values
-- ---------------------------------------------------------------------------

create or replace function public.booking_buffer_minutes(p_location_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select ls.default_buffer_minutes from public.location_settings ls where ls.location_id = p_location_id),
    5
  );
$$;

create or replace function public.booking_hold_minutes()
returns integer
language sql
immutable
as $$ select 15 $$;

-- The one definition of "does this appointment row occupy the barber's time".
-- Active statuses always block. Unpaid checkout holds block only until they
-- expire. Every other status (cancelled, declined, expired, failed, no-show,
-- rescheduled, draft) never blocks.
create or replace function public.appointment_is_blocking(
  p_status text,
  p_deposit_status text,
  p_hold_expires_at timestamptz,
  p_now timestamptz
)
returns boolean
language sql
immutable
as $$
  select p_status in ('confirmed', 'checked_in', 'assigned', 'in_service')
      or (
        p_status in ('slot_held', 'pending_confirmation')
        and (p_deposit_status = 'paid' or p_hold_expires_at is null or p_hold_expires_at > p_now)
      );
$$;

create or replace function public.barber_calendar_lock_key(p_barber_profile_id uuid)
returns bigint
language sql
immutable
as $$ select hashtextextended('lbl-barber-calendar:' || p_barber_profile_id::text, 0) $$;

insert into public.audit_logs (business_id, actor_user_id, actor_role, action, resource_type, resource_id, reason, before_data, after_data, metadata)
select l.business_id, null, 'system', 'scheduling.buffer_updated', 'location_settings', ls.location_id::text,
       'Appointment buffer set to exactly 5 minutes',
       jsonb_build_object('default_buffer_minutes', ls.default_buffer_minutes),
       jsonb_build_object('default_buffer_minutes', 5),
       jsonb_build_object('migration', '202610020001')
from public.location_settings ls
join public.locations l on l.id = ls.location_id
where ls.default_buffer_minutes is distinct from 5;

alter table public.location_settings alter column default_buffer_minutes set default 5;
update public.location_settings set default_buffer_minutes = 5 where default_buffer_minutes is distinct from 5;

-- ---------------------------------------------------------------------------
-- 2. Appointment columns
-- ---------------------------------------------------------------------------

alter table public.appointments
  add column if not exists hold_expires_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists occupied_until timestamptz,
  add column if not exists booking_kind text not null default 'single',
  add column if not exists party_size integer not null default 1,
  add column if not exists reschedule_count integer not null default 0,
  add column if not exists buffer_minutes_override integer;

comment on column public.appointments.hold_expires_at is 'When an unpaid checkout hold stops reserving its time. Null for paid appointments.';
comment on column public.appointments.completed_at is 'Actual completion time recorded by Finish. starts_at/ends_at keep the originally scheduled reservation.';
comment on column public.appointments.occupied_until is 'End of the time this appointment blocks, including the buffer. Maintained by trigger; never write it directly.';
comment on column public.appointments.buffer_minutes_override is 'Only for appointments that already existed closer than the buffer when the 5-minute rule was introduced. Cleared automatically when the appointment is moved. Never set for new bookings.';
comment on column public.appointments.booking_kind is 'single, or family (one adult service followed by Kids Haircuts; see appointment_service_items).';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'appointments_booking_kind_check') then
    alter table public.appointments add constraint appointments_booking_kind_check check (booking_kind in ('single', 'family'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'appointments_party_size_check') then
    alter table public.appointments add constraint appointments_party_size_check check (party_size between 1 and 6);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'appointments_buffer_override_check') then
    alter table public.appointments add constraint appointments_buffer_override_check check (buffer_minutes_override is null or buffer_minutes_override between 0 and 120);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Deterministic backfill (triggers paused so updated_at and notifications
--    are not disturbed for historical rows)
-- ---------------------------------------------------------------------------

-- Triggers that were already switched off stay off afterwards.
create temporary table lbl_disabled_appointment_triggers on commit drop as
select tgname from pg_trigger
where tgrelid = 'public.appointments'::regclass and not tgisinternal and tgenabled = 'D';

alter table public.appointments disable trigger user;

update public.appointments a
set hold_expires_at = a.created_at + make_interval(mins => public.booking_hold_minutes())
where a.status in ('slot_held', 'pending_confirmation')
  and a.deposit_status <> 'paid'
  and a.hold_expires_at is null
  and not exists (
    select 1 from public.appointment_payment_links l
    where l.appointment_id = a.id and l.status = 'paid'
  );

-- A hold that already carries a verified payment never lapses on its own: it
-- keeps its place (hold_expires_at is null) until staff resolve it.
update public.appointments a
set hold_expires_at = null
where a.status in ('slot_held', 'pending_confirmation')
  and a.deposit_status <> 'paid'
  and a.hold_expires_at is not null
  and (
    exists (
      select 1 from public.appointment_payment_links l
      where l.appointment_id = a.id and l.status = 'paid'
    )
    or exists (
      select 1
      from public.appointment_payment_links l
      join public.square_payments sp
        on sp.business_id = l.business_id and sp.square_order_id = l.square_order_id
      where l.appointment_id = a.id and upper(coalesce(sp.status, '')) in ('COMPLETED', 'APPROVED')
    )
  );

-- Abandoned checkouts: unpaid holds whose 15-minute window has passed and that
-- have no verified payment of any kind. They are marked expired (never
-- deleted) with a history row, which releases the time they were blocking.
with stale as (
  select a.id, a.status as from_status
  from public.appointments a
  where a.status in ('slot_held', 'pending_confirmation')
    and a.deposit_status <> 'paid'
    and a.hold_expires_at <= now()
    and not exists (
      select 1 from public.appointment_payment_links l
      where l.appointment_id = a.id and l.status = 'paid'
    )
    and not exists (
      select 1
      from public.appointment_payment_links l
      join public.square_payments sp
        on sp.business_id = l.business_id and sp.square_order_id = l.square_order_id
      where l.appointment_id = a.id and upper(coalesce(sp.status, '')) in ('COMPLETED', 'APPROVED')
    )
), expired as (
  update public.appointments a
  set status = 'expired', updated_at = timezone('utc', now())
  from stale
  where a.id = stale.id
  returning a.id, stale.from_status
)
insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
select e.id, null, e.from_status, 'expired', null, 'Unpaid checkout hold expired',
       jsonb_build_object('source', 'migration_202610020001', 'hold_minutes', public.booking_hold_minutes())
from expired e;

-- Appointments that were booked back to back while the gap was zero keep
-- their place: each records the real gap to its next neighbour, so the new
-- constraint accepts the existing pair. New bookings never get an override.
update public.appointments a
set buffer_minutes_override = greatest(0, floor(extract(epoch from (n.next_start - a.ends_at)) / 60))::integer
from (
  select x.id,
         (select min(b.starts_at)
          from public.appointments b
          where b.barber_profile_id = x.barber_profile_id
            and b.id <> x.id
            and b.status in ('slot_held', 'pending_confirmation', 'confirmed', 'checked_in', 'assigned', 'in_service')
            and (b.starts_at, b.id) > (x.starts_at, x.id)
            and b.starts_at < x.ends_at + make_interval(mins => public.booking_buffer_minutes(x.location_id))) as next_start
  from public.appointments x
  where x.status in ('slot_held', 'pending_confirmation', 'confirmed', 'checked_in', 'assigned', 'in_service')
    and x.buffer_minutes_override is null
) n
where n.id = a.id and n.next_start is not null;

-- Same formula as the appointments_maintain_occupancy trigger, so running
-- this migration again never undoes an early Finish.
update public.appointments a
set occupied_until = case
      when a.status = 'completed' and a.completed_at is not null and a.completed_at <= a.starts_at then a.starts_at
      when a.status = 'completed' and a.completed_at is not null
        then least(a.ends_at, a.completed_at) + make_interval(mins => coalesce(a.buffer_minutes_override, public.booking_buffer_minutes(a.location_id)))
      else a.ends_at + make_interval(mins => coalesce(a.buffer_minutes_override, public.booking_buffer_minutes(a.location_id)))
    end;

alter table public.appointments enable trigger user;

do $$
declare
  v_trigger record;
begin
  for v_trigger in select tgname from lbl_disabled_appointment_triggers loop
    execute format('alter table public.appointments disable trigger %I', v_trigger.tgname);
  end loop;
end;
$$;

alter table public.appointments alter column occupied_until set not null;

-- ---------------------------------------------------------------------------
-- 4. Occupancy maintenance (runs last among BEFORE triggers so it sees the
--    final status chosen by the other guards)
-- ---------------------------------------------------------------------------

create or replace function public.appointments_maintain_occupancy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_buffer interval;
  v_hold interval := make_interval(mins => public.booking_hold_minutes());
begin
  -- A grandfathered gap belongs to one exact placement. Once the appointment
  -- is moved, or for any new booking, the normal buffer applies.
  if tg_op = 'INSERT' then
    new.buffer_minutes_override := null;
  elsif new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.barber_profile_id is distinct from old.barber_profile_id then
    new.buffer_minutes_override := null;
  end if;
  v_buffer := make_interval(mins => coalesce(new.buffer_minutes_override, public.booking_buffer_minutes(new.location_id)));

  if new.status in ('slot_held', 'pending_confirmation') and coalesce(new.deposit_status, 'pending') <> 'paid' then
    if tg_op = 'INSERT' then
      new.hold_expires_at := coalesce(new.hold_expires_at, now() + v_hold);
    elsif old.status not in ('slot_held', 'pending_confirmation') then
      new.hold_expires_at := now() + v_hold;
    end if;
    -- Once any payment for this checkout is verified, the hold stops counting
    -- down: a paying client keeps the time until the booking is confirmed or
    -- staff resolve it. A hold that had already lapsed is not brought back
    -- here; confirm_paid_appointment decides that under the calendar lock.
    if new.hold_expires_at is not null and new.hold_expires_at > now() and exists (
      select 1 from public.appointment_payment_links l
      where l.appointment_id = new.id and l.status = 'paid'
    ) then
      new.hold_expires_at := null;
    end if;
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  if new.status = 'completed' and new.completed_at is not null and new.completed_at <= new.starts_at then
    -- Finished before it was due to start: it never occupied the chair.
    new.occupied_until := new.starts_at;
  elsif new.status = 'completed' then
    -- Finishing early releases the unused reservation; finishing late never
    -- extends it. The scheduled starts_at/ends_at are left untouched.
    new.occupied_until := least(new.ends_at, coalesce(new.completed_at, new.ends_at)) + v_buffer;
  else
    new.occupied_until := new.ends_at + v_buffer;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_appointments_maintain_occupancy on public.appointments;
create trigger zz_appointments_maintain_occupancy
before insert or update on public.appointments
for each row execute function public.appointments_maintain_occupancy();

-- Keep stored occupancy aligned if the buffer setting is ever changed.
create or replace function public.refresh_appointment_occupancy_for_location()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.default_buffer_minutes is distinct from old.default_buffer_minutes then
    update public.appointments a
    set occupied_until = a.occupied_until
    where a.location_id = new.location_id
      and a.status in ('slot_held', 'pending_confirmation', 'confirmed', 'checked_in', 'assigned', 'in_service')
      and a.ends_at >= now() - interval '1 day';
  end if;
  return null;
end;
$$;

drop trigger if exists location_settings_refresh_occupancy on public.location_settings;
create trigger location_settings_refresh_occupancy
after update of default_buffer_minutes on public.location_settings
for each row execute function public.refresh_appointment_occupancy_for_location();

-- ---------------------------------------------------------------------------
-- 5. The scheduling guard: one rule set for create, move, reassign, restore
-- ---------------------------------------------------------------------------

create or replace function public.enforce_appointment_barber_availability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_buffer interval;
  v_new_until timestamptz;
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_date date;
  v_weekday smallint;
  v_shop_open time;
  v_shop_close time;
  v_shop_closed boolean;
  v_covered boolean;
  v_conflict_id uuid;
  v_conflict_status text;
begin
  -- Rows that do not occupy time are never validated.
  if not public.appointment_is_blocking(new.status, new.deposit_status, new.hold_expires_at, v_now) then
    return new;
  end if;

  if new.barber_profile_id is null or new.location_id is null
     or new.starts_at is null or new.ends_at is null or new.ends_at <= new.starts_at then
    raise exception 'INVALID_APPOINTMENT_WINDOW' using errcode = 'P0001';
  end if;

  -- A lifecycle change (check in, start service...) of an appointment that
  -- already holds its place is not a new placement and is not re-validated.
  if tg_op = 'UPDATE'
     and public.appointment_is_blocking(old.status, old.deposit_status, old.hold_expires_at, v_now)
     and new.barber_profile_id = old.barber_profile_id
     and new.location_id = old.location_id
     and new.starts_at = old.starts_at
     and new.ends_at = old.ends_at then
    return new;
  end if;

  -- Serialize every placement for this barber. RPCs take the same lock before
  -- they touch the row, so the lock order is always calendar -> row.
  perform pg_advisory_xact_lock(public.barber_calendar_lock_key(new.barber_profile_id));

  -- Release abandoned checkouts for this barber before checking conflicts.
  -- A hold with a verified payment is never released here: it keeps its place
  -- until the payment confirms it. Nothing is written when nothing is stale.
  if exists (
    select 1
    from public.appointments a
    where a.barber_profile_id = new.barber_profile_id
      and a.id <> new.id
      and a.status in ('slot_held', 'pending_confirmation')
      and a.deposit_status <> 'paid'
      and a.hold_expires_at is not null
      and a.hold_expires_at <= v_now
      and not exists (select 1 from public.appointment_payment_links l where l.appointment_id = a.id and l.status = 'paid')
  ) then
    with stale as (
      select a.id, a.status as from_status
      from public.appointments a
      where a.barber_profile_id = new.barber_profile_id
        and a.id <> new.id
        and a.status in ('slot_held', 'pending_confirmation')
        and a.deposit_status <> 'paid'
        and a.hold_expires_at is not null
        and a.hold_expires_at <= v_now
        and not exists (select 1 from public.appointment_payment_links l where l.appointment_id = a.id and l.status = 'paid')
      for update of a skip locked
    ), expired as (
      update public.appointments a
      set status = 'expired'
      from stale
      where a.id = stale.id
      returning a.id, stale.from_status
    )
    insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
    select e.id, null, e.from_status, 'expired', null, 'Unpaid checkout hold expired',
           jsonb_build_object('source', 'scheduling_guard', 'hold_minutes', public.booking_hold_minutes())
    from expired e;
  end if;

  v_buffer := make_interval(mins => public.booking_buffer_minutes(new.location_id));
  v_new_until := new.ends_at + v_buffer;

  select coalesce(l.timezone, 'America/New_York') into v_timezone
  from public.locations l where l.id = new.location_id;
  v_timezone := coalesce(v_timezone, 'America/New_York');

  v_local_start := new.starts_at at time zone v_timezone;
  v_local_end := new.ends_at at time zone v_timezone;
  v_date := v_local_start::date;
  v_weekday := extract(dow from v_local_start)::smallint;

  if v_local_end::date <> v_date then
    raise exception 'APPOINTMENT_OUTSIDE_BARBER_SCHEDULE' using errcode = 'P0001';
  end if;

  -- Rule 1a: inside the lounge's opening hours (a holiday row replaces the weekly row).
  select h.opens_at, h.closes_at, h.closed
    into v_shop_open, v_shop_close, v_shop_closed
  from public.holiday_hours h
  where h.location_id = new.location_id and h.service_date = v_date
  limit 1;

  if not found then
    select bh.opens_at, bh.closes_at, bh.closed
      into v_shop_open, v_shop_close, v_shop_closed
    from public.business_hours bh
    where bh.location_id = new.location_id and bh.weekday = v_weekday
    limit 1;
  end if;

  if coalesce(v_shop_closed, true) or v_shop_open is null or v_shop_close is null
     or v_local_start::time < v_shop_open or v_local_end::time > v_shop_close then
    raise exception 'APPOINTMENT_OUTSIDE_BUSINESS_HOURS' using errcode = 'P0001';
  end if;

  -- Rule 1b: inside the barber's saved schedule. Overlapping or touching rows
  -- (weekly row plus a date-specific addition) are merged, exactly as the
  -- application's scheduleWindowsForDate() does.
  select coalesce(
           range_agg(tsrange(v_date + bs.starts_at, v_date + bs.ends_at, '[)'))
             @> tsrange(v_local_start, v_local_end, '[)'),
           false
         )
    into v_covered
  from public.barber_schedules bs
  where bs.barber_profile_id = new.barber_profile_id
    and bs.location_id = new.location_id
    and bs.active = true
    and bs.weekday = v_weekday
    and bs.effective_from <= v_date
    and (bs.effective_to is null or bs.effective_to >= v_date)
    and bs.starts_at is not null
    and bs.ends_at is not null
    and bs.ends_at > bs.starts_at;

  if not coalesce(v_covered, false) then
    raise exception 'APPOINTMENT_OUTSIDE_BARBER_SCHEDULE' using errcode = 'P0001';
  end if;

  -- Rule 2: not inside approved unavailable time. No buffer around time off.
  if exists (
    select 1 from public.barber_time_off bo
    where bo.barber_profile_id = new.barber_profile_id
      and bo.status = 'approved'
      and coalesce(bo.availability_kind, 'unavailable') = 'unavailable'
      and bo.starts_at < new.ends_at
      and bo.ends_at > new.starts_at
  ) then
    raise exception 'BARBER_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.barber_breaks bb
    where bb.barber_profile_id = new.barber_profile_id
      and bb.status = 'scheduled'
      and bb.starts_at < new.ends_at
      and bb.ends_at > new.starts_at
  ) then
    raise exception 'BARBER_ON_BREAK' using errcode = 'P0001';
  end if;

  -- Rules 3-5: no overlap with an occupying appointment, a live checkout hold,
  -- or a just-finished appointment, each extended by the buffer. Because both
  -- ranges carry the buffer, the gap between neighbours is exactly one buffer.
  select a.id, a.status into v_conflict_id, v_conflict_status
  from public.appointments a
  where a.barber_profile_id = new.barber_profile_id
    and a.id <> new.id
    and (
      public.appointment_is_blocking(a.status, a.deposit_status, a.hold_expires_at, v_now)
      or a.status = 'completed'
    )
    and a.starts_at < v_new_until
    -- A new placement always keeps the full buffer, even next to an
    -- appointment whose own stored gap was grandfathered.
    and (case
           when a.buffer_minutes_override is null then a.occupied_until
           else a.occupied_until - make_interval(mins => a.buffer_minutes_override) + v_buffer
         end) > new.starts_at
    -- An appointment finished before it started occupies nothing.
    and a.occupied_until > a.starts_at
  order by a.starts_at
  limit 1;

  if v_conflict_id is not null then
    raise exception 'SLOT_CONFLICT'
      using errcode = '23P01',
            detail = format('Conflicts with %s appointment %s (buffer %s).', v_conflict_status, v_conflict_id, v_buffer);
  end if;

  if exists (
    select 1 from public.slot_holds sh
    where sh.barber_profile_id = new.barber_profile_id
      and sh.status = 'active'
      and sh.expires_at > v_now
      and sh.starts_at < v_new_until
      and sh.ends_at + v_buffer > new.starts_at
  ) then
    raise exception 'SLOT_CONFLICT' using errcode = '23P01', detail = 'Conflicts with an active slot hold.';
  end if;

  return new;
end;
$$;

-- The standalone time-off trigger duplicated rule 2 and re-ran on every status
-- change. The guard above is now the only implementation.
drop trigger if exists trg_enforce_approved_barber_time_off_on_appointment on public.appointments;
drop function if exists public.enforce_approved_barber_time_off_on_appointment();

-- Database-level backstop: even if two requests race past every other check,
-- two occupying appointments of one barber can never be closer than the buffer.
alter table public.appointments drop constraint if exists appointments_no_active_overlap;
alter table public.appointments drop constraint if exists appointments_no_buffered_overlap;
alter table public.appointments
  add constraint appointments_no_buffered_overlap
  exclude using gist (
    barber_profile_id with =,
    tstzrange(starts_at, occupied_until, '[)') with &&
  )
  where (status in ('slot_held', 'pending_confirmation', 'confirmed', 'checked_in', 'assigned', 'in_service'));

-- ---------------------------------------------------------------------------
-- 6. Status transitions: Finish from any operational state; a verified late
--    payment may restore an expired hold when its time is still free
-- ---------------------------------------------------------------------------

create or replace function public.appointment_transition_allowed(current_status text, next_status text)
returns boolean
language sql
immutable
as $$
select case current_status
  when 'draft' then next_status in ('slot_held', 'pending_confirmation', 'confirmed', 'failed', 'expired')
  when 'slot_held' then next_status in ('pending_confirmation', 'confirmed', 'expired', 'failed')
  when 'pending_confirmation' then next_status in ('confirmed', 'declined', 'expired', 'failed')
  when 'confirmed' then next_status in ('checked_in', 'completed', 'rescheduled', 'cancelled_by_client', 'cancelled_by_business', 'no_show')
  when 'checked_in' then next_status in ('assigned', 'in_service', 'completed', 'cancelled_by_business', 'no_show')
  when 'assigned' then next_status in ('in_service', 'completed', 'cancelled_by_business', 'no_show')
  when 'in_service' then next_status in ('completed', 'cancelled_by_business')
  when 'rescheduled' then next_status in ('confirmed', 'cancelled_by_client', 'cancelled_by_business', 'no_show')
  else false
end;
$$;

create or replace function public.validate_appointment_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_paid_principal integer := 0;
begin
  if old.status is distinct from new.status then
    if old.status in ('cancelled_by_business', 'expired')
       and new.status = 'confirmed'
       and coalesce(new.deposit_status, 'pending') = 'paid' then
      select coalesce(sum(case
        when apl.status = 'paid' and apl.purpose in ('deposit', 'balance') then coalesce(apl.amount_cents, 0)
        else 0
      end), 0)
      into v_paid_principal
      from public.appointment_payment_links apl
      where apl.appointment_id = new.id;

      if v_paid_principal >= coalesce(new.service_price_snapshot_cents, 0) then
        return new;
      end if;
    end if;

    if not public.appointment_transition_allowed(old.status, new.status)
       and not (
         old.status = 'confirmed'
         and new.status = 'pending_confirmation'
         and new.booking_source = 'website'
         and coalesce(new.deposit_status, 'pending') <> 'paid'
       ) then
      raise exception 'INVALID_APPOINTMENT_STATUS_TRANSITION' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Family bookings
-- ---------------------------------------------------------------------------

alter table public.services
  add column if not exists family_adult_eligible boolean not null default true;

comment on column public.services.family_adult_eligible is 'Whether the adult in a family booking may choose this service. The child service is never adult-eligible.';

create table if not exists public.family_booking_tiers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  children_count integer not null check (children_count between 1 and 5),
  child_service_id uuid not null references public.services(id),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug),
  unique (business_id, children_count)
);

alter table public.family_booking_tiers enable row level security;

drop policy if exists family_booking_tiers_public_read on public.family_booking_tiers;
create policy family_booking_tiers_public_read on public.family_booking_tiers
  for select using (active);

drop policy if exists family_booking_tiers_admin_manage on public.family_booking_tiers;
create policy family_booking_tiers_admin_manage on public.family_booking_tiers
  for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

drop trigger if exists family_booking_tiers_updated_at on public.family_booking_tiers;
create trigger family_booking_tiers_updated_at
before update on public.family_booking_tiers
for each row execute function public.set_updated_at();

create table if not exists public.appointment_service_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  sequence integer not null check (sequence >= 1),
  role text not null check (role in ('adult', 'child')),
  label text not null,
  service_id uuid not null references public.services(id),
  service_name_snapshot text not null,
  price_snapshot_cents integer not null check (price_snapshot_cents >= 0),
  duration_snapshot_minutes integer not null check (duration_snapshot_minutes > 0),
  offset_minutes integer not null check (offset_minutes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (appointment_id, sequence)
);

alter table public.appointment_service_items enable row level security;

drop policy if exists appointment_service_items_access on public.appointment_service_items;
create policy appointment_service_items_access on public.appointment_service_items
  for select using (exists (select 1 from public.appointments a where a.id = appointment_id));

drop policy if exists appointment_service_items_staff_manage on public.appointment_service_items;
create policy appointment_service_items_staff_manage on public.appointment_service_items
  for all using (exists (select 1 from public.appointments a where a.id = appointment_id and public.can_operate_business(a.business_id)))
  with check (exists (select 1 from public.appointments a where a.id = appointment_id and public.can_operate_business(a.business_id)));

-- The child component is always the live Kids Haircut service. Its price and
-- duration are read from public.services at booking time, never copied here.
update public.services s
set family_adult_eligible = false
from public.businesses b
where b.id = s.business_id and b.slug = 'luxury-barber-lounge' and s.slug = 'kids-haircut' and s.family_adult_eligible;

insert into public.family_booking_tiers (business_id, slug, name, description, children_count, child_service_id, active, sort_order)
select b.id,
       'family-' || n,
       jsonb_build_object('en', 'Family ' || n, 'es', 'Familia ' || n),
       jsonb_build_object(
         'en', '1 adult + ' || n || case when n = 1 then ' kid' else ' kids' end,
         'es', '1 adulto + ' || n || case when n = 1 then ' niño' else ' niños' end
       ),
       n,
       s.id,
       true,
       n
from public.businesses b
join public.services s on s.business_id = b.id and s.slug = 'kids-haircut'
cross join generate_series(1, 5) as n
where b.slug = 'luxury-barber-lounge'
on conflict (business_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Atomic booking creation (same call shape as before; family aware)
-- ---------------------------------------------------------------------------

create or replace function public.create_appointment_atomic(p_data jsonb)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.appointments;
  existing public.appointments;
  selected_barber public.barber_profiles;
  selected_service public.services;
  child_service public.services;
  requested_start timestamptz := (p_data->>'starts_at')::timestamptz;
  requested_end timestamptz := (p_data->>'ends_at')::timestamptz;
  v_kind text := coalesce(nullif(p_data->>'booking_kind', ''), 'single');
  v_children integer := coalesce(nullif(p_data->>'family_children_count', '')::integer, 0);
  v_buffer integer;
  v_duration integer;
  v_price integer;
  v_name text;
  v_party integer := 1;
  v_offset integer := 0;
  v_index integer;
begin
  select * into existing from public.appointments where idempotency_key = (p_data->>'idempotency_key')::uuid;
  if found then return existing; end if;

  if requested_end <= requested_start then raise exception 'INVALID_APPOINTMENT_RANGE' using errcode = '22023'; end if;
  if v_kind not in ('single', 'family') then raise exception 'INVALID_BOOKING_KIND' using errcode = '22023'; end if;

  select * into selected_service from public.services
  where id = (p_data->>'service_id')::uuid and active and bookable;
  if not found then raise exception 'SERVICE_NOT_BOOKABLE' using errcode = '22023'; end if;

  select * into selected_barber from public.barber_profiles
  where id = (p_data->>'barber_profile_id')::uuid and active and status = 'published';
  if not found then raise exception 'BARBER_NOT_BOOKABLE' using errcode = '22023'; end if;

  if not exists (
    select 1 from public.barber_profile_services bps
    where bps.barber_profile_id = selected_barber.id and bps.service_id = selected_service.id and bps.active
  ) then
    raise exception 'BARBER_SERVICE_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  v_duration := (p_data->>'service_duration_snapshot_minutes')::integer;
  v_price := (p_data->>'service_price_snapshot_cents')::integer;
  v_name := p_data->>'service_name_snapshot';

  if v_kind = 'family' then
    -- The database derives the family composition from the live catalog and
    -- refuses a request whose duration or price disagrees with it.
    if v_children < 1 or v_children > 5 then raise exception 'INVALID_FAMILY_BOOKING' using errcode = '22023'; end if;
    if not selected_service.family_adult_eligible then raise exception 'INVALID_FAMILY_BOOKING' using errcode = '22023', detail = 'Adult service is not eligible.'; end if;

    select s.* into child_service
    from public.family_booking_tiers t
    join public.services s on s.id = t.child_service_id
    where t.business_id = selected_service.business_id and t.children_count = v_children and t.active
      and s.active and s.bookable;
    if not found then raise exception 'INVALID_FAMILY_BOOKING' using errcode = '22023', detail = 'Family tier is not available.'; end if;

    if not exists (
      select 1 from public.barber_profile_services bps
      where bps.barber_profile_id = selected_barber.id and bps.service_id = child_service.id and bps.active
    ) then
      raise exception 'BARBER_SERVICE_NOT_ELIGIBLE' using errcode = '22023';
    end if;

    v_buffer := public.booking_buffer_minutes((p_data->>'location_id')::uuid);
    v_party := v_children + 1;
    v_duration := selected_service.duration_minutes + v_children * child_service.duration_minutes + v_children * v_buffer;
    v_price := selected_service.price_cents + v_children * child_service.price_cents;

    if v_duration is null or v_price is null
       or v_duration <> (p_data->>'service_duration_snapshot_minutes')::integer
       or v_price <> (p_data->>'service_price_snapshot_cents')::integer then
      raise exception 'BOOKING_CATALOG_CHANGED' using errcode = '22023',
        detail = format('Expected %s minutes and %s cents.', v_duration, v_price);
    end if;
  end if;

  if requested_end <> requested_start + make_interval(mins => v_duration) then
    if v_kind = 'family' then
      raise exception 'BOOKING_CATALOG_CHANGED' using errcode = '22023', detail = 'Family duration does not match the requested window.';
    end if;
  end if;

  -- Lock order: barber calendar first, rows second.
  perform pg_advisory_xact_lock(public.barber_calendar_lock_key(selected_barber.id));
  update public.slot_holds set status = 'expired' where status = 'active' and expires_at <= timezone('utc', now());

  insert into public.appointments (
    business_id, location_id, client_id, auth_user_id, service_id, barber_profile_id, assigned_staff_user_id,
    public_reference, manage_token_hash, square_booking_id, square_customer_id, square_order_id,
    service_name_snapshot, service_price_snapshot_cents, service_duration_snapshot_minutes, addon_snapshot,
    barber_name_snapshot, client_name_snapshot, client_email_snapshot, client_phone_snapshot,
    starts_at, ends_at, timezone, status, booking_source, campaign_source, campaign_medium, campaign_name, referral_source,
    deposit_required_cents, deposit_status, client_notes, policy_version, policy_accepted_at, email_consent, sms_consent,
    idempotency_key, formsubmit_status, client_confirmation_status, barber_notification_status, sync_status, created_by,
    booking_kind, party_size
  )
  values (
    (p_data->>'business_id')::uuid, (p_data->>'location_id')::uuid, (p_data->>'client_id')::uuid, nullif(p_data->>'auth_user_id', '')::uuid,
    selected_service.id, selected_barber.id, selected_barber.staff_user_id,
    p_data->>'public_reference', p_data->>'manage_token_hash', nullif(p_data->>'square_booking_id', ''), nullif(p_data->>'square_customer_id', ''), nullif(p_data->>'square_order_id', ''),
    v_name, v_price, v_duration, coalesce(p_data->'addon_snapshot', '[]'::jsonb),
    p_data->>'barber_name_snapshot', p_data->>'client_name_snapshot', nullif(p_data->>'client_email_snapshot', '')::citext, nullif(p_data->>'client_phone_snapshot', ''),
    requested_start, requested_end, coalesce(nullif(p_data->>'timezone', ''), 'America/New_York'),
    coalesce(nullif(p_data->>'status', ''), 'confirmed'), coalesce(nullif(p_data->>'booking_source', ''), 'website'),
    nullif(p_data->>'campaign_source', ''), nullif(p_data->>'campaign_medium', ''), nullif(p_data->>'campaign_name', ''), nullif(p_data->>'referral_source', ''),
    coalesce((p_data->>'deposit_required_cents')::integer, 0), coalesce(nullif(p_data->>'deposit_status', ''), 'not_required'),
    nullif(p_data->>'client_notes', ''), p_data->>'policy_version', (p_data->>'policy_accepted_at')::timestamptz,
    coalesce((p_data->>'email_consent')::boolean, true), coalesce((p_data->>'sms_consent')::boolean, false),
    (p_data->>'idempotency_key')::uuid, coalesce(nullif(p_data->>'formsubmit_status', ''), 'queued'), 'queued',
    case when selected_barber.staff_user_id is null then 'suppressed' else 'queued' end,
    coalesce(nullif(p_data->>'sync_status', ''), 'supabase_primary'), nullif(p_data->>'created_by', '')::uuid,
    v_kind, v_party
  )
  returning * into created;

  if v_kind = 'family' then
    insert into public.appointment_service_items (appointment_id, sequence, role, label, service_id, service_name_snapshot, price_snapshot_cents, duration_snapshot_minutes, offset_minutes)
    values (created.id, 1, 'adult', 'Adult', selected_service.id, coalesce(selected_service.name->>'en', 'Adult service'), selected_service.price_cents, selected_service.duration_minutes, 0);
    v_offset := selected_service.duration_minutes;
    for v_index in 1..v_children loop
      v_offset := v_offset + v_buffer;
      insert into public.appointment_service_items (appointment_id, sequence, role, label, service_id, service_name_snapshot, price_snapshot_cents, duration_snapshot_minutes, offset_minutes)
      values (created.id, v_index + 1, 'child', 'Child ' || v_index, child_service.id, coalesce(child_service.name->>'en', 'Kids Haircut'), child_service.price_cents, child_service.duration_minutes, v_offset);
      v_offset := v_offset + child_service.duration_minutes;
    end loop;
  end if;

  insert into public.appointment_assignments (appointment_id, barber_profile_id, assigned_staff_user_id, assignment_source, reason, assigned_by)
  values (created.id, created.barber_profile_id, created.assigned_staff_user_id,
          case when coalesce((p_data->>'first_available')::boolean, false) then 'first_available' else 'booking' end,
          'Selected during booking', created.created_by);

  insert into public.appointment_status_history (booking_metadata_id, appointment_id, from_status, to_status, changed_by, reason, metadata)
  values (null, created.id, null, created.status, created.created_by, 'Appointment created',
          jsonb_build_object('source', created.booking_source, 'booking_kind', created.booking_kind, 'party_size', created.party_size));

  insert into public.audit_logs (business_id, actor_user_id, actor_role, action, resource_type, resource_id, reason, after_data, metadata)
  values (created.business_id, created.created_by, case when created.created_by is null then 'public' else 'authenticated' end,
          case when created.booking_kind = 'family' then 'booking.family_created' else 'booking.created' end,
          'appointment', created.id::text, 'Atomic booking creation', to_jsonb(created),
          jsonb_build_object('correlation_id', created.idempotency_key, 'reference', created.public_reference));

  return created;
exception
  when exclusion_violation then
    raise exception 'SLOT_CONFLICT' using errcode = '23P01';
end;
$$;

revoke all on function public.create_appointment_atomic(jsonb) from public, anon, authenticated;
grant execute on function public.create_appointment_atomic(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 9. Atomic reschedule / reassign. The whole booking (every family member)
--    moves as one block and keeps its exact duration.
-- ---------------------------------------------------------------------------

drop function if exists public.reschedule_appointment_atomic(uuid, timestamptz, timestamptz, uuid, text, text);

create or replace function public.reschedule_appointment_atomic(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_actor uuid,
  p_actor_role text,
  p_reason text,
  p_barber_profile_id uuid default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.appointments;
  updated_row public.appointments;
  target_barber public.barber_profiles;
  v_target uuid;
  v_new_end timestamptz;
  v_time_changed boolean;
  v_barber_changed boolean;
  v_key bigint;
  v_locked_barber uuid;
begin
  select * into current_row from public.appointments where id = p_appointment_id;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  v_target := coalesce(p_barber_profile_id, current_row.barber_profile_id);

  -- Lock order: barber calendars (in a stable order) first, the row second.
  for v_key in
    select distinct k from unnest(array[
      public.barber_calendar_lock_key(current_row.barber_profile_id),
      public.barber_calendar_lock_key(v_target)
    ]) as k order by k
  loop
    perform pg_advisory_xact_lock(v_key);
  end loop;

  v_locked_barber := current_row.barber_profile_id;
  select * into current_row from public.appointments where id = p_appointment_id for update;
  -- Someone else moved this appointment to another barber between our first
  -- read and the lock. Stop instead of working from a stale picture.
  if current_row.barber_profile_id is distinct from v_locked_barber then
    raise exception 'APPOINTMENT_CHANGED' using errcode = 'P0001';
  end if;
  -- Confirmed appointments can be moved. A booking that was paid after its
  -- hold had lapsed (expired, fully paid) can be placed at a new time by staff.
  if not (
    current_row.status in ('confirmed', 'rescheduled')
    or (current_row.status = 'expired' and current_row.deposit_status = 'paid')
  ) then
    raise exception 'APPOINTMENT_NOT_RESCHEDULABLE' using errcode = '22023';
  end if;
  if p_starts_at is null then raise exception 'INVALID_APPOINTMENT_RANGE' using errcode = '22023'; end if;

  -- p_ends_at is accepted for backward compatibility; the stored duration is
  -- authoritative so a move can never shorten or split a booking.
  v_new_end := p_starts_at + (current_row.ends_at - current_row.starts_at);
  v_time_changed := p_starts_at is distinct from current_row.starts_at;
  v_barber_changed := v_target is distinct from current_row.barber_profile_id;

  -- Idempotent: repeating a move that already happened changes nothing.
  if not v_time_changed and not v_barber_changed and current_row.status = 'confirmed' then
    return current_row;
  end if;

  if (v_time_changed or current_row.status = 'expired') and p_starts_at < now() - interval '1 minute' then
    raise exception 'RESCHEDULE_IN_PAST' using errcode = '22023';
  end if;

  -- A time-only move keeps the current barber, whatever their profile state.
  -- Handing the appointment to someone else needs an active, unarchived barber.
  select * into target_barber from public.barber_profiles
  where id = v_target and business_id = current_row.business_id;
  if not found or (v_barber_changed and (not target_barber.active or target_barber.status = 'archived')) then
    raise exception 'BARBER_NOT_BOOKABLE' using errcode = '22023';
  end if;

  if v_barber_changed then
    if not exists (
      select 1 from public.barber_profile_services bps
      where bps.barber_profile_id = v_target and bps.service_id = current_row.service_id and bps.active
    ) or exists (
      select 1 from public.appointment_service_items i
      where i.appointment_id = current_row.id
        and not exists (
          select 1 from public.barber_profile_services bps
          where bps.barber_profile_id = v_target and bps.service_id = i.service_id and bps.active
        )
    ) then
      raise exception 'BARBER_SERVICE_NOT_ELIGIBLE' using errcode = '22023';
    end if;
  end if;

  update public.appointments
  set starts_at = p_starts_at,
      ends_at = v_new_end,
      barber_profile_id = v_target,
      assigned_staff_user_id = case when v_barber_changed then target_barber.staff_user_id else assigned_staff_user_id end,
      barber_name_snapshot = case when v_barber_changed then target_barber.display_name else barber_name_snapshot end,
      status = 'confirmed',
      reschedule_count = reschedule_count + 1
  where id = p_appointment_id
  returning * into updated_row;

  if v_barber_changed then
    update public.appointment_assignments set active = false, released_at = timezone('utc', now())
    where appointment_id = p_appointment_id and active;
    insert into public.appointment_assignments (appointment_id, barber_profile_id, assigned_staff_user_id, assignment_source, reason, assigned_by)
    values (p_appointment_id, v_target, target_barber.staff_user_id, 'admin', coalesce(nullif(p_reason, ''), 'Reassigned'), p_actor);
  end if;

  insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
  values (p_appointment_id, null, current_row.status, 'confirmed', p_actor, coalesce(nullif(p_reason, ''), 'Appointment rescheduled'),
          jsonb_build_object(
            'previous_starts_at', current_row.starts_at, 'starts_at', updated_row.starts_at,
            'previous_ends_at', current_row.ends_at, 'ends_at', updated_row.ends_at,
            'previous_barber_profile_id', current_row.barber_profile_id, 'barber_profile_id', updated_row.barber_profile_id,
            'reschedule_count', updated_row.reschedule_count, 'source', p_actor_role));

  insert into public.audit_logs (business_id, actor_user_id, actor_role, action, resource_type, resource_id, reason, before_data, after_data, metadata)
  values (current_row.business_id, p_actor, p_actor_role,
          case when v_time_changed then 'booking.rescheduled' else 'booking.barber_reassigned' end,
          'appointment', p_appointment_id::text, coalesce(nullif(p_reason, ''), 'Appointment rescheduled'),
          jsonb_build_object('starts_at', current_row.starts_at, 'ends_at', current_row.ends_at, 'barber_profile_id', current_row.barber_profile_id, 'barber_name', current_row.barber_name_snapshot, 'status', current_row.status),
          jsonb_build_object('starts_at', updated_row.starts_at, 'ends_at', updated_row.ends_at, 'barber_profile_id', updated_row.barber_profile_id, 'barber_name', updated_row.barber_name_snapshot, 'status', updated_row.status),
          jsonb_build_object('reference', current_row.public_reference, 'booking_kind', current_row.booking_kind, 'party_size', current_row.party_size, 'reschedule_count', updated_row.reschedule_count));

  return updated_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_CONFLICT' using errcode = '23P01';
end;
$$;

revoke all on function public.reschedule_appointment_atomic(uuid, timestamptz, timestamptz, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.reschedule_appointment_atomic(uuid, timestamptz, timestamptz, uuid, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 10. Finish: record the actual completion time and release unused time
-- ---------------------------------------------------------------------------

create or replace function public.complete_appointment_atomic(
  p_appointment_id uuid,
  p_actor uuid,
  p_actor_role text,
  p_reason text default null,
  p_completed_at timestamptz default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.appointments;
  updated_row public.appointments;
  v_completed timestamptz := least(coalesce(p_completed_at, now()), now());
begin
  select * into current_row from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;

  -- Idempotent: a second Finish click changes nothing and writes no history.
  if current_row.status = 'completed' then return current_row; end if;

  if current_row.status not in ('confirmed', 'checked_in', 'assigned', 'in_service') then
    raise exception 'APPOINTMENT_NOT_FINISHABLE' using errcode = '22023';
  end if;

  -- Guards against finishing tomorrow's appointment by accident.
  if v_completed < current_row.starts_at - interval '120 minutes' then
    raise exception 'APPOINTMENT_NOT_STARTED' using errcode = '22023';
  end if;

  update public.appointments
  set status = 'completed', completed_at = v_completed
  where id = p_appointment_id
  returning * into updated_row;

  insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
  values (p_appointment_id, null, current_row.status, 'completed', p_actor, coalesce(nullif(p_reason, ''), 'Appointment finished'),
          jsonb_build_object(
            'source', p_actor_role,
            'scheduled_starts_at', current_row.starts_at,
            'scheduled_ends_at', current_row.ends_at,
            'completed_at', updated_row.completed_at,
            'available_again_at', updated_row.occupied_until,
            'released_minutes', greatest(0, floor(extract(epoch from (current_row.ends_at - greatest(updated_row.completed_at, current_row.starts_at))) / 60))::integer));

  insert into public.audit_logs (business_id, actor_user_id, actor_role, action, resource_type, resource_id, reason, before_data, after_data, metadata)
  values (current_row.business_id, p_actor, p_actor_role, 'booking.completed', 'appointment', p_appointment_id::text,
          coalesce(nullif(p_reason, ''), 'Appointment finished'),
          jsonb_build_object('status', current_row.status, 'starts_at', current_row.starts_at, 'ends_at', current_row.ends_at),
          jsonb_build_object('status', updated_row.status, 'completed_at', updated_row.completed_at, 'occupied_until', updated_row.occupied_until),
          jsonb_build_object('reference', current_row.public_reference));

  return updated_row;
end;
$$;

revoke all on function public.complete_appointment_atomic(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.complete_appointment_atomic(uuid, uuid, text, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 11. Checkout holds: automatic expiry and safe payment confirmation
-- ---------------------------------------------------------------------------

create or replace function public.expire_unpaid_appointment_holds(p_limit integer default 200)
returns setof public.appointments
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nothing is written (and nothing is broadcast) when nothing is stale.
  if not exists (
    select 1
    from public.appointments a
    where a.status in ('slot_held', 'pending_confirmation')
      and a.deposit_status <> 'paid'
      and a.hold_expires_at is not null
      and a.hold_expires_at <= now()
      and not exists (
        select 1 from public.appointment_payment_links l
        where l.appointment_id = a.id and l.status = 'paid'
      )
  ) then
    return;
  end if;

  return query
  with stale as (
    select a.id, a.status as from_status
    from public.appointments a
    where a.status in ('slot_held', 'pending_confirmation')
      and a.deposit_status <> 'paid'
      and a.hold_expires_at is not null
      and a.hold_expires_at <= now()
      and not exists (
        select 1 from public.appointment_payment_links l
        where l.appointment_id = a.id and l.status = 'paid'
      )
    order by a.hold_expires_at
    limit greatest(1, least(coalesce(p_limit, 200), 1000))
    for update skip locked
  ), expired as (
    update public.appointments a
    set status = 'expired'
    from stale
    where a.id = stale.id
    returning a.*
  ), history as (
    insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
    select e.id, null, s.from_status, 'expired', null, 'Unpaid checkout hold expired',
           jsonb_build_object('source', 'hold_expiry_job', 'hold_minutes', public.booking_hold_minutes())
    from expired e join stale s on s.id = e.id
    returning appointment_id
  )
  select e.* from expired e;
end;
$$;

revoke all on function public.expire_unpaid_appointment_holds(integer) from public, anon, authenticated;
grant execute on function public.expire_unpaid_appointment_holds(integer) to service_role;

-- Called when a client returns to pay for a checkout whose hold window has
-- passed. The hold is renewed only if its time is still free (the guard
-- re-validates it as a new placement); otherwise it is marked expired so the
-- client is asked to choose a new time instead of paying for a taken slot.
create or replace function public.renew_appointment_hold(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.appointments;
  updated_row public.appointments;
begin
  select * into current_row from public.appointments where id = p_appointment_id;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;

  perform pg_advisory_xact_lock(public.barber_calendar_lock_key(current_row.barber_profile_id));
  select * into current_row from public.appointments where id = p_appointment_id for update;

  if current_row.status not in ('slot_held', 'pending_confirmation')
     or current_row.deposit_status = 'paid'
     or current_row.hold_expires_at is null
     or current_row.hold_expires_at > now() then
    return current_row;
  end if;

  begin
    -- "status = status" makes the scheduling guard run; the old row is a
    -- lapsed hold, so the guard validates this as a brand-new placement.
    update public.appointments
    set hold_expires_at = now() + make_interval(mins => public.booking_hold_minutes()),
        status = status
    where id = p_appointment_id
    returning * into updated_row;
    return updated_row;
  exception
    when exclusion_violation or raise_exception then
      update public.appointments set status = 'expired' where id = p_appointment_id returning * into updated_row;
      insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
      values (p_appointment_id, null, current_row.status, 'expired', null, 'Unpaid checkout hold expired and its time is no longer free',
              jsonb_build_object('source', 'hold_renewal', 'hold_minutes', public.booking_hold_minutes()));
      return updated_row;
  end;
end;
$$;

revoke all on function public.renew_appointment_hold(uuid) from public, anon, authenticated;
grant execute on function public.renew_appointment_hold(uuid) to service_role;

-- Promotes a verified, fully paid booking to confirmed. A hold that is still
-- live simply confirms. A hold that already expired is restored only when its
-- time is still free. When the time is gone, nothing is double-booked: the
-- booking is left as "expired, paid" so staff can place it at a new time or
-- refund it, and the result says conflict = true so the caller alerts them.
-- Returns {"promoted": boolean, "conflict": boolean, "appointment": row}.
-- promoted is true only for the one call that actually changed the status,
-- so confirmations are sent once.
create or replace function public.confirm_paid_appointment(p_appointment_id uuid, p_actor uuid default null, p_source text default 'square_webhook')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.appointments;
  updated_row public.appointments;
  v_reason text;
begin
  select * into current_row from public.appointments where id = p_appointment_id;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;

  perform pg_advisory_xact_lock(public.barber_calendar_lock_key(current_row.barber_profile_id));
  select * into current_row from public.appointments where id = p_appointment_id for update;

  -- Never resurrect a cancelled, declined, completed or no-show appointment.
  if current_row.status not in ('slot_held', 'pending_confirmation', 'expired') then
    return jsonb_build_object('promoted', false, 'conflict', false, 'appointment', to_jsonb(current_row));
  end if;

  begin
    update public.appointments set status = 'confirmed' where id = p_appointment_id returning * into updated_row;
  exception
    when exclusion_violation or raise_exception then
      -- The scheduling guard refused the placement: the time was taken, or is
      -- no longer inside the barber's schedule. The block above is undone.
      v_reason := sqlerrm;
      update public.appointments
      set status = 'expired',
          deposit_status = case when deposit_status = 'refunded' then deposit_status else 'paid' end
      where id = p_appointment_id
      returning * into updated_row;
      if current_row.status is distinct from 'expired' then
        insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
        values (p_appointment_id, null, current_row.status, 'expired', p_actor,
                'Payment verified after the hold expired; the time is no longer available',
                jsonb_build_object('source', p_source, 'guard', v_reason));
      end if;
      return jsonb_build_object('promoted', false, 'conflict', true, 'reason', v_reason, 'appointment', to_jsonb(updated_row));
  end;

  if updated_row.status is distinct from current_row.status then
    insert into public.appointment_status_history (appointment_id, booking_metadata_id, from_status, to_status, changed_by, reason, metadata)
    values (p_appointment_id, null, current_row.status, updated_row.status, p_actor,
            case when current_row.status = 'expired' then 'Payment verified after the hold expired; time was still free' else 'Payment verified' end,
            jsonb_build_object('source', p_source));
  end if;

  return jsonb_build_object(
    'promoted', updated_row.status = 'confirmed' and current_row.status is distinct from 'confirmed',
    'conflict', false,
    'appointment', to_jsonb(updated_row)
  );
end;
$$;

revoke all on function public.confirm_paid_appointment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_paid_appointment(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 12. Realtime: tell every open calendar and booking page that availability
--     changed (payload carries no personal data)
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_booking_availability_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.send(
    jsonb_build_object('changedAt', timezone('utc', now()), 'source', tg_table_name, 'operation', tg_op),
    'availability_changed',
    'booking-availability:northfield',
    false
  );
  return null;
exception
  when others then
    -- A Realtime delivery problem must never break a booking transaction.
    -- Clients fall back to their periodic refresh.
    raise warning 'Availability broadcast failed for %.%: %', tg_table_schema, tg_table_name, sqlerrm;
    return null;
end;
$$;

drop trigger if exists appointments_availability_broadcast on public.appointments;
create trigger appointments_availability_broadcast
after insert or delete or update of status, starts_at, ends_at, barber_profile_id, completed_at, hold_expires_at on public.appointments
for each statement execute function public.broadcast_booking_availability_change();

drop trigger if exists barber_time_off_availability_broadcast on public.barber_time_off;
create trigger barber_time_off_availability_broadcast
after insert or delete or update on public.barber_time_off
for each statement execute function public.broadcast_booking_availability_change();

drop trigger if exists barber_schedules_availability_broadcast on public.barber_schedules;
create trigger barber_schedules_availability_broadcast
after insert or delete or update on public.barber_schedules
for each statement execute function public.broadcast_booking_availability_change();

drop trigger if exists barber_breaks_availability_broadcast on public.barber_breaks;
create trigger barber_breaks_availability_broadcast
after insert or delete or update on public.barber_breaks
for each statement execute function public.broadcast_booking_availability_change();

drop trigger if exists holiday_hours_availability_broadcast on public.holiday_hours;
create trigger holiday_hours_availability_broadcast
after insert or delete or update on public.holiday_hours
for each statement execute function public.broadcast_booking_availability_change();

-- ---------------------------------------------------------------------------
-- 13. Public booking catalog: expose family tiers and adult eligibility
-- ---------------------------------------------------------------------------

create or replace function public.get_public_booking_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with selected_business as (
    select id from public.businesses
    where slug = 'luxury-barber-lounge' and status = 'active'
    limit 1
  ), selected_location as (
    select l.*
    from public.locations l
    join selected_business b on b.id = l.business_id
    where l.slug = 'northfield' and l.active
    limit 1
  )
  select jsonb_build_object(
    'location', coalesce((
      select jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'timezone', l.timezone,
        'address', concat_ws(', ', l.address_line_1, l.city, l.region, l.postal_code)
      ) from selected_location l
    ), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sc.id,
        'slug', sc.slug,
        'name', sc.name,
        'description', sc.description
      ) order by sc.sort_order, sc.slug)
      from public.service_categories sc
      join selected_business b on b.id = sc.business_id
      where sc.active
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'slug', s.slug,
        'category_id', s.category_id,
        'name', s.name,
        'short_description', s.short_description,
        'full_description', s.full_description,
        'price_cents', s.price_cents,
        'duration_minutes', s.duration_minutes,
        'deposit_cents', s.deposit_cents,
        'family_adult_eligible', s.family_adult_eligible
      ) order by s.sort_order, s.slug)
      from public.services s
      join selected_business b on b.id = s.business_id
      where s.active and s.bookable and s.content_status = 'published'
        and exists (
          select 1
          from public.barber_profile_services bps
          join public.barber_profiles bp on bp.id = bps.barber_profile_id
          join public.barber_schedules bs on bs.barber_profile_id = bp.id
          join selected_location l on l.id = bs.location_id
          where bps.service_id = s.id and bps.active
            and bp.active and not bp.demo and bp.status = 'published'
            and bs.active
            and (bs.effective_to is null or bs.effective_to >= current_date)
        )
    ), '[]'::jsonb),
    'addons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'slug', a.slug,
        'service_id', a.service_id,
        'name', a.name,
        'description', a.description,
        'price_cents', a.price_cents,
        'duration_minutes', a.duration_minutes
      ) order by a.slug)
      from public.service_addons a
      join selected_business b on b.id = a.business_id
      where a.active
    ), '[]'::jsonb),
    'barbers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bp.id,
        'slug', bp.slug,
        'display_name', bp.display_name,
        'professional_title', bp.professional_title,
        'short_intro', bp.short_intro,
        'specialties', bp.specialties,
        'languages', bp.languages,
        'demo', bp.demo,
        'service_ids', coalesce((
          select jsonb_agg(bps.service_id order by bps.service_id)
          from public.barber_profile_services bps
          where bps.barber_profile_id = bp.id and bps.active
        ), '[]'::jsonb),
        'bookable', exists (
          select 1
          from public.barber_schedules bs
          join selected_location l on l.id = bs.location_id
          where bs.barber_profile_id = bp.id
            and bs.active
            and (bs.effective_to is null or bs.effective_to >= current_date)
        )
      ) order by bp.sort_order, bp.display_name)
      from public.barber_profiles bp
      join selected_business b on b.id = bp.business_id
      where bp.active and not bp.demo and bp.status = 'published'
        and exists (
          select 1 from public.barber_profile_services bps
          where bps.barber_profile_id = bp.id and bps.active
        )
    ), '[]'::jsonb),
    'family', jsonb_build_object(
      'buffer_minutes', coalesce((select public.booking_buffer_minutes(l.id) from selected_location l), 5),
      'tiers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', t.slug,
          'name', t.name,
          'description', t.description,
          'children_count', t.children_count,
          'child_service_id', t.child_service_id
        ) order by t.sort_order, t.children_count)
        from public.family_booking_tiers t
        join selected_business b on b.id = t.business_id
        join public.services cs on cs.id = t.child_service_id
        where t.active and cs.active and cs.bookable and cs.content_status = 'published'
      ), '[]'::jsonb)
    )
  );
$$;

grant execute on function public.get_public_booking_catalog() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 14. Indexes for the hot booking paths
-- ---------------------------------------------------------------------------

create index if not exists idx_appointments_hold_expiry
  on public.appointments (hold_expires_at)
  where status in ('slot_held', 'pending_confirmation');

create index if not exists idx_barber_breaks_profile_window
  on public.barber_breaks (barber_profile_id, starts_at, ends_at)
  where status = 'scheduled';

commit;
