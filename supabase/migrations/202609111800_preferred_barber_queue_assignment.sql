begin;

create or replace function public.assign_preferred_barber_queue_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_from_status text;
begin
  if new.preferred_barber_id is null
     or new.status not in ('waiting','confirmed','checked_in','assigned','called','ready','in_service') then
    return new;
  end if;

  if exists (
    select 1
    from public.queue_assignments qa
    where qa.queue_entry_id = new.id
      and qa.active = true
  ) then
    return new;
  end if;

  if not exists (
    select 1
    from public.barber_profiles bp
    join public.barber_profile_services bps
      on bps.barber_profile_id = bp.id
     and bps.active = true
    left join public.services s on s.id = bps.service_id
    where bp.business_id = new.business_id
      and bp.staff_user_id = new.preferred_barber_id
      and bp.active = true
      and bp.status <> 'archived'
      and (
        (new.service_id is not null and bps.service_id = new.service_id)
        or (new.service_id is null and new.service_slug is not null and s.slug = new.service_slug)
      )
  ) then
    return new;
  end if;

  insert into public.queue_assignments (
    queue_entry_id,
    barber_user_id,
    assigned_by,
    reason,
    active,
    assignment_source,
    explanation
  ) values (
    new.id,
    new.preferred_barber_id,
    null,
    'Requested barber',
    true,
    'automatic',
    jsonb_build_object('reason','requested barber','source','queue preference')
  )
  returning id into v_assignment_id;

  if new.status in ('waiting','confirmed','checked_in') then
    v_from_status := new.status;
    update public.queue_entries
    set status = 'assigned',
        updated_at = now()
    where id = new.id
      and status = v_from_status;

    insert into public.queue_status_history (
      queue_entry_id,
      from_status,
      to_status,
      changed_by,
      note
    ) values (
      new.id,
      v_from_status,
      'assigned',
      null,
      'Requested barber assigned automatically'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_preferred_barber_queue_entry on public.queue_entries;
create trigger trg_assign_preferred_barber_queue_entry
after insert or update of preferred_barber_id, status, service_id, service_slug
on public.queue_entries
for each row execute function public.assign_preferred_barber_queue_entry();

insert into public.queue_assignments (
  queue_entry_id,
  barber_user_id,
  assigned_by,
  reason,
  active,
  assignment_source,
  explanation
)
select
  qe.id,
  qe.preferred_barber_id,
  null,
  'Requested barber',
  true,
  'automatic',
  jsonb_build_object('reason','requested barber','source','integrity repair')
from public.queue_entries qe
join public.barber_profiles bp
  on bp.business_id = qe.business_id
 and bp.staff_user_id = qe.preferred_barber_id
 and bp.active = true
 and bp.status <> 'archived'
where qe.preferred_barber_id is not null
  and qe.status in ('waiting','confirmed','checked_in','assigned','called','ready','in_service')
  and exists (
    select 1
    from public.barber_profile_services bps
    left join public.services s on s.id = bps.service_id
    where bps.barber_profile_id = bp.id
      and bps.active = true
      and (
        (qe.service_id is not null and bps.service_id = qe.service_id)
        or (qe.service_id is null and qe.service_slug is not null and s.slug = qe.service_slug)
      )
  )
  and not exists (
    select 1
    from public.queue_assignments qa
    where qa.queue_entry_id = qe.id
      and qa.active = true
  );

update public.queue_entries qe
set status = 'assigned', updated_at = now()
where qe.preferred_barber_id is not null
  and qe.status in ('waiting','confirmed','checked_in')
  and exists (
    select 1
    from public.queue_assignments qa
    where qa.queue_entry_id = qe.id
      and qa.barber_user_id = qe.preferred_barber_id
      and qa.active = true
  );

commit;
