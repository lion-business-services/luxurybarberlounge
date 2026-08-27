alter table public.barber_time_off
  add column if not exists availability_kind text not null default 'unavailable';

alter table public.barber_time_off
  drop constraint if exists barber_time_off_availability_kind_check;
alter table public.barber_time_off
  add constraint barber_time_off_availability_kind_check
  check (availability_kind in ('available','unavailable'));

create index if not exists idx_barber_time_off_availability
  on public.barber_time_off (barber_profile_id, location_id, availability_kind, status, starts_at, ends_at);

create unique index if not exists idx_barber_schedules_profile_location_weekday_effective
  on public.barber_schedules (barber_profile_id, location_id, weekday, effective_from);

create or replace function public.enforce_appointment_barber_availability()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_date date;
  v_weekday smallint;
  v_has_schedule boolean;
  v_has_extra_available boolean;
  v_has_unavailable boolean;
begin
  if new.status not in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service') then
    return new;
  end if;

  select coalesce(l.timezone, 'America/New_York') into v_timezone
  from public.locations l where l.id = new.location_id;

  v_timezone := coalesce(v_timezone, 'America/New_York');
  v_local_start := new.starts_at at time zone v_timezone;
  v_local_end := new.ends_at at time zone v_timezone;
  v_date := v_local_start::date;
  v_weekday := extract(dow from v_local_start)::smallint;

  if v_local_end::date <> v_date then
    raise exception 'APPOINTMENT_OUTSIDE_BARBER_AVAILABILITY' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.barber_schedules bs
    where bs.barber_profile_id = new.barber_profile_id
      and bs.location_id = new.location_id
      and bs.active = true
      and bs.weekday = v_weekday
      and bs.effective_from <= v_date
      and (bs.effective_to is null or bs.effective_to >= v_date)
      and bs.starts_at <= v_local_start::time
      and bs.ends_at >= v_local_end::time
  ) into v_has_schedule;

  select exists (
    select 1 from public.barber_time_off bo
    where bo.barber_profile_id = new.barber_profile_id
      and bo.location_id = new.location_id
      and bo.status = 'approved'
      and bo.availability_kind = 'available'
      and bo.starts_at <= new.starts_at
      and bo.ends_at >= new.ends_at
  ) into v_has_extra_available;

  if not (v_has_schedule or v_has_extra_available) then
    raise exception 'APPOINTMENT_OUTSIDE_BARBER_AVAILABILITY' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.barber_time_off bo
    where bo.barber_profile_id = new.barber_profile_id
      and bo.location_id = new.location_id
      and bo.status = 'approved'
      and bo.availability_kind = 'unavailable'
      and tstzrange(bo.starts_at, bo.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) into v_has_unavailable;

  if v_has_unavailable then
    raise exception 'APPOINTMENT_DURING_BARBER_UNAVAILABLE_PERIOD' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_appointment_barber_availability on public.appointments;
create trigger trg_enforce_appointment_barber_availability
before insert or update of barber_profile_id, location_id, starts_at, ends_at, status
on public.appointments
for each row execute function public.enforce_appointment_barber_availability();
