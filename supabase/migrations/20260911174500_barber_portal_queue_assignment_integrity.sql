begin;

-- The public booking catalog is managed by barber profile/service mappings,
-- while the queue assignment engine consumes staff/service mappings. Keep
-- those two operational views synchronized so every linked barber is eligible
-- for the same services in queue routing that they are eligible to perform.
insert into public.staff_services (
  staff_user_id,
  service_id,
  price_override_cents,
  duration_override_minutes,
  active
)
select
  bp.staff_user_id,
  bps.service_id,
  bps.price_override_cents,
  bps.duration_override_minutes,
  bps.active
from public.barber_profile_services bps
join public.barber_profiles bp on bp.id = bps.barber_profile_id
where bp.staff_user_id is not null
on conflict (staff_user_id, service_id) do update
set price_override_cents = excluded.price_override_cents,
    duration_override_minutes = excluded.duration_override_minutes,
    active = excluded.active;

create or replace function public.sync_barber_profile_service_to_staff_service()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_staff_user_id uuid;
begin
  v_profile_id := coalesce(new.barber_profile_id, old.barber_profile_id);
  select staff_user_id
  into v_staff_user_id
  from public.barber_profiles
  where id = v_profile_id;

  if tg_op = 'DELETE' then
    if v_staff_user_id is not null then
      delete from public.staff_services
      where staff_user_id = v_staff_user_id
        and service_id = old.service_id;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.service_id is distinct from new.service_id
     and v_staff_user_id is not null then
    delete from public.staff_services
    where staff_user_id = v_staff_user_id
      and service_id = old.service_id;
  end if;

  if v_staff_user_id is not null then
    insert into public.staff_services (
      staff_user_id,
      service_id,
      price_override_cents,
      duration_override_minutes,
      active
    ) values (
      v_staff_user_id,
      new.service_id,
      new.price_override_cents,
      new.duration_override_minutes,
      new.active
    )
    on conflict (staff_user_id, service_id) do update
    set price_override_cents = excluded.price_override_cents,
        duration_override_minutes = excluded.duration_override_minutes,
        active = excluded.active;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_barber_profile_service_to_staff_service
  on public.barber_profile_services;
create trigger trg_sync_barber_profile_service_to_staff_service
after insert or update or delete on public.barber_profile_services
for each row execute function public.sync_barber_profile_service_to_staff_service();

create or replace function public.sync_barber_profile_staff_link_services()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.staff_user_id is not distinct from new.staff_user_id then
    return new;
  end if;

  if old.staff_user_id is not null then
    delete from public.staff_services ss
    where ss.staff_user_id = old.staff_user_id
      and exists (
        select 1
        from public.barber_profile_services bps
        where bps.barber_profile_id = new.id
          and bps.service_id = ss.service_id
      );
  end if;

  if new.staff_user_id is not null then
    insert into public.staff_services (
      staff_user_id,
      service_id,
      price_override_cents,
      duration_override_minutes,
      active
    )
    select
      new.staff_user_id,
      bps.service_id,
      bps.price_override_cents,
      bps.duration_override_minutes,
      bps.active
    from public.barber_profile_services bps
    where bps.barber_profile_id = new.id
    on conflict (staff_user_id, service_id) do update
    set price_override_cents = excluded.price_override_cents,
        duration_override_minutes = excluded.duration_override_minutes,
        active = excluded.active;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_barber_profile_staff_link_services
  on public.barber_profiles;
create trigger trg_sync_barber_profile_staff_link_services
after update of staff_user_id on public.barber_profiles
for each row execute function public.sync_barber_profile_staff_link_services();

-- Walk-in forms submit a barber slug. The queue engine and barber portal use
-- the linked staff user id. Resolve the slug at the database boundary so every
-- entry path (public, client, kiosk, or reception) gets the same canonical id.
create or replace function public.resolve_queue_preferred_barber()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.barber_preference is distinct from old.barber_preference then
    new.preferred_barber_id := null;
  end if;

  if new.preferred_barber_id is not null then
    return new;
  end if;

  if new.barber_preference is null
     or btrim(new.barber_preference) = ''
     or lower(btrim(new.barber_preference)) in (
       'first-available',
       'first available',
       'any',
       'any-barber',
       'any barber'
     ) then
    return new;
  end if;

  select bp.staff_user_id
  into new.preferred_barber_id
  from public.barber_profiles bp
  where bp.business_id = new.business_id
    and bp.slug = new.barber_preference
    and bp.active = true
    and bp.status <> 'archived'
    and bp.staff_user_id is not null
  limit 1;

  return new;
end;
$$;

drop trigger if exists trg_resolve_queue_preferred_barber
  on public.queue_entries;
create trigger trg_resolve_queue_preferred_barber
before insert or update of barber_preference, business_id, preferred_barber_id
on public.queue_entries
for each row execute function public.resolve_queue_preferred_barber();

-- Repair any active named-barber queue rows that predate the resolver.
update public.queue_entries qe
set preferred_barber_id = bp.staff_user_id,
    updated_at = now()
from public.barber_profiles bp
where qe.business_id = bp.business_id
  and qe.barber_preference = bp.slug
  and qe.preferred_barber_id is null
  and qe.status in (
    'waiting',
    'confirmed',
    'checked_in',
    'assigned',
    'called',
    'ready',
    'in_service'
  )
  and bp.active = true
  and bp.status <> 'archived'
  and bp.staff_user_id is not null;

commit;
