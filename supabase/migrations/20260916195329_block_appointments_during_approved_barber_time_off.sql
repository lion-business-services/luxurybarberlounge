create or replace function public.enforce_approved_barber_time_off_on_appointment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.barber_profile_id is null
     or new.starts_at is null
     or new.ends_at is null
     or new.status not in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service') then
    return new;
  end if;

  if exists (
    select 1
    from public.barber_time_off t
    where t.barber_profile_id = new.barber_profile_id
      and t.status = 'approved'
      and coalesce(t.availability_kind, 'unavailable') = 'unavailable'
      and t.starts_at < new.ends_at
      and t.ends_at > new.starts_at
  ) then
    raise exception 'BARBER_UNAVAILABLE' using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_approved_barber_time_off_on_appointment on public.appointments;
create trigger trg_enforce_approved_barber_time_off_on_appointment
before insert or update of barber_profile_id, starts_at, ends_at, status
on public.appointments
for each row
execute function public.enforce_approved_barber_time_off_on_appointment();
