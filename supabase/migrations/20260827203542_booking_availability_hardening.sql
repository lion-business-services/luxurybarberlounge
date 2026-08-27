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
  v_shop_open time;
  v_shop_close time;
  v_shop_closed boolean;
  v_has_schedule boolean;
  v_has_extra_available boolean;
  v_has_unavailable boolean;
  v_has_break boolean;
  v_has_conflict boolean;
  v_buffer_minutes integer := 0;
begin
  if new.status not in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service') then
    return new;
  end if;

  if new.barber_profile_id is null or new.location_id is null or new.starts_at is null or new.ends_at is null or new.ends_at <= new.starts_at then
    raise exception 'INVALID_APPOINTMENT_WINDOW' using errcode = 'P0001';
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

  select exists (
    select 1 from public.barber_breaks bb
    where bb.barber_profile_id = new.barber_profile_id
      and bb.status <> 'cancelled'
      and tstzrange(bb.starts_at, bb.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')
  ) into v_has_break;

  if v_has_break then
    raise exception 'APPOINTMENT_DURING_BARBER_BREAK' using errcode = 'P0001';
  end if;

  select greatest(0, coalesce(ls.default_buffer_minutes, 0))
    into v_buffer_minutes
  from public.location_settings ls
  where ls.location_id = new.location_id
  limit 1;
  v_buffer_minutes := coalesce(v_buffer_minutes, 0);

  select exists (
    select 1 from public.appointments a
    where a.barber_profile_id = new.barber_profile_id
      and a.location_id = new.location_id
      and a.id <> new.id
      and a.status in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service')
      and tstzrange(a.starts_at, a.ends_at + make_interval(mins => v_buffer_minutes), '[)')
          && tstzrange(new.starts_at, new.ends_at + make_interval(mins => v_buffer_minutes), '[)')
  ) into v_has_conflict;

  if v_has_conflict then
    raise exception 'APPOINTMENT_BARBER_CONFLICT' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

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
        'deposit_cents', s.deposit_cents
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
    ), '[]'::jsonb)
  );
$$;
