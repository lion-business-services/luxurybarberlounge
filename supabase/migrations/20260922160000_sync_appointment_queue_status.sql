-- Keep appointment-backed operational queue rows synchronized with appointment lifecycle.
create or replace function public.sync_appointment_status_to_queue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q_status text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  q_status := case new.status
    when 'checked_in' then 'checked_in'
    when 'assigned' then 'assigned'
    when 'in_service' then 'in_service'
    when 'completed' then 'completed'
    when 'no_show' then 'no_show'
    when 'cancelled_by_client' then 'removed'
    when 'cancelled_by_business' then 'removed'
    else null
  end;

  if q_status is null then
    return new;
  end if;

  update public.queue_entries
  set status = q_status,
      estimated_wait_minutes = case when q_status in ('in_service','completed','no_show','removed') then 0 else estimated_wait_minutes end,
      service_started_at = case when q_status = 'in_service' then coalesce(service_started_at, now()) else service_started_at end,
      completed_at = case when q_status = 'completed' then coalesce(completed_at, now()) else completed_at end
  where appointment_id = new.id
    and status not in ('completed','cancelled','removed','no_show');

  if q_status in ('completed','no_show','removed') then
    update public.queue_assignments qa
    set active = false,
        released_at = coalesce(released_at, now())
    where qa.active = true
      and exists (
        select 1 from public.queue_entries qe
        where qe.id = qa.queue_entry_id
          and qe.appointment_id = new.id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_sync_queue_status on public.appointments;
create trigger appointments_sync_queue_status
after update of status on public.appointments
for each row execute function public.sync_appointment_status_to_queue();

-- Repair any appointment-backed queue rows that were already stale before this migration.
update public.queue_entries qe
set status = case a.status
      when 'completed' then 'completed'
      when 'in_service' then 'in_service'
      when 'no_show' then 'no_show'
      when 'cancelled_by_client' then 'removed'
      when 'cancelled_by_business' then 'removed'
      else qe.status
    end,
    estimated_wait_minutes = case when a.status in ('completed','in_service','no_show','cancelled_by_client','cancelled_by_business') then 0 else qe.estimated_wait_minutes end,
    service_started_at = case when a.status = 'in_service' then coalesce(qe.service_started_at, now()) else qe.service_started_at end,
    completed_at = case when a.status = 'completed' then coalesce(qe.completed_at, now()) else qe.completed_at end
from public.appointments a
where qe.appointment_id = a.id
  and a.status in ('completed','in_service','no_show','cancelled_by_client','cancelled_by_business');

update public.queue_assignments qa
set active = false,
    released_at = coalesce(released_at, now())
where qa.active = true
  and exists (
    select 1
    from public.queue_entries qe
    join public.appointments a on a.id = qe.appointment_id
    where qe.id = qa.queue_entry_id
      and a.status in ('completed','no_show','cancelled_by_client','cancelled_by_business')
  );
