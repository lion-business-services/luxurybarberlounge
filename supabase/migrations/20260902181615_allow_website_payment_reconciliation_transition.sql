create or replace function public.validate_appointment_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and not public.appointment_transition_allowed(old.status, new.status)
     and not (
       old.status = 'confirmed'
       and new.status = 'pending_confirmation'
       and new.booking_source = 'website'
       and coalesce(new.deposit_status, 'pending') <> 'paid'
     ) then
    raise exception 'INVALID_APPOINTMENT_STATUS_TRANSITION' using errcode = '22023';
  end if;
  return new;
end;
$$;
