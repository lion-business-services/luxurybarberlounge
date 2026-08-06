-- Luxury Barber Lounge: Ruben owner/barber consolidation, responsive image metadata,
-- and a read-only public booking catalog that does not require service-role access.
begin;

-- Reuse an existing owner/founder/barber record when possible so historical IDs,
-- Square mappings, appointments, commissions, and queue relationships survive.
do $$
declare
  v_business_id uuid;
  v_canonical_id uuid;
  v_duplicate record;
  v_merge_ok boolean;
begin
  select id into v_business_id
  from public.businesses
  where slug = 'luxury-barber-lounge';

  if v_business_id is null then
    raise exception 'Luxury Barber Lounge business record is required before migration 017';
  end if;

  select id into v_canonical_id
  from public.barber_profiles
  where business_id = v_business_id
    and (
      slug = 'ruben-diaz-jr'
      or lower(regexp_replace(
        translate(display_name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
        '[^a-zA-Z0-9]+', '', 'g'
      )) in ('rubendiazjr', 'rubendiaz')
    )
  order by case when slug = 'ruben-diaz-jr' then 0 else 1 end, created_at
  limit 1;

  if v_canonical_id is null then
    insert into public.barber_profiles (
      business_id, slug, display_name, professional_title, short_intro,
      biography, story, specialties, languages, social_links, featured,
      active, demo, status, sort_order
    ) values (
      v_business_id,
      'ruben-diaz-jr',
      'Rubén Diaz, Jr.',
      '{"en":"Owner and Master Barber","es":"Propietario y Maestro Barbero"}'::jsonb,
      '{"en":"Rubén Diaz, Jr. founded Luxury Barber Lounge to elevate the traditional barbershop experience through precision, personal service, confidence, and a refined atmosphere.","es":"Rubén Diaz, Jr. fundó Luxury Barber Lounge para elevar la experiencia tradicional de barbería mediante precisión, servicio personal, confianza y un ambiente refinado."}'::jsonb,
      '{"en":"Rubén Diaz, Jr. founded Luxury Barber Lounge to elevate the traditional barbershop experience through precision, personal service, confidence, and a refined atmosphere.","es":"Rubén Diaz, Jr. fundó Luxury Barber Lounge para elevar la experiencia tradicional de barbería mediante precisión, servicio personal, confianza y un ambiente refinado."}'::jsonb,
      '{"en":"His approach combines disciplined craftsmanship with a commitment to making every client feel recognized, comfortable, and distinguished.","es":"Su enfoque combina una técnica disciplinada con el compromiso de hacer que cada cliente se sienta reconocido, cómodo y distinguido."}'::jsonb,
      '["precision grooming","personal service","refined barbering"]'::jsonb,
      array[]::text[],
      '{"instagramStatus":"not_provided"}'::jsonb,
      true, true, false, 'published', 0
    )
    returning id into v_canonical_id;
  else
    update public.barber_profiles
    set
      slug = 'ruben-diaz-jr',
      display_name = 'Rubén Diaz, Jr.',
      professional_title = '{"en":"Owner and Master Barber","es":"Propietario y Maestro Barbero"}'::jsonb,
      short_intro = '{"en":"Rubén Diaz, Jr. founded Luxury Barber Lounge to elevate the traditional barbershop experience through precision, personal service, confidence, and a refined atmosphere.","es":"Rubén Diaz, Jr. fundó Luxury Barber Lounge para elevar la experiencia tradicional de barbería mediante precisión, servicio personal, confianza y un ambiente refinado."}'::jsonb,
      biography = '{"en":"Rubén Diaz, Jr. founded Luxury Barber Lounge to elevate the traditional barbershop experience through precision, personal service, confidence, and a refined atmosphere.","es":"Rubén Diaz, Jr. fundó Luxury Barber Lounge para elevar la experiencia tradicional de barbería mediante precisión, servicio personal, confianza y un ambiente refinado."}'::jsonb,
      story = '{"en":"His approach combines disciplined craftsmanship with a commitment to making every client feel recognized, comfortable, and distinguished.","es":"Su enfoque combina una técnica disciplinada con el compromiso de hacer que cada cliente se sienta reconocido, cómodo y distinguido."}'::jsonb,
      specialties = '["precision grooming","personal service","refined barbering"]'::jsonb,
      featured = true,
      active = true,
      demo = false,
      status = 'published',
      sort_order = 0,
      updated_at = timezone('utc', now())
    where id = v_canonical_id;
  end if;

  for v_duplicate in
    select id, staff_user_id, square_team_member_id
    from public.barber_profiles
    where business_id = v_business_id
      and id <> v_canonical_id
      and (
        slug in ('ruben-diaz', 'ruben-diaz-jr', 'owner-ruben', 'ruben-owner')
        or lower(regexp_replace(
          translate(display_name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
          '[^a-zA-Z0-9]+', '', 'g'
        )) in ('rubendiazjr', 'rubendiaz')
      )
  loop
    v_merge_ok := true;

    update public.barber_profiles canonical
    set
      staff_user_id = coalesce(canonical.staff_user_id, v_duplicate.staff_user_id),
      square_team_member_id = coalesce(canonical.square_team_member_id, v_duplicate.square_team_member_id)
    where canonical.id = v_canonical_id;

    update public.clients
      set preferred_barber_profile_id = v_canonical_id
      where preferred_barber_profile_id = v_duplicate.id;

    insert into public.barber_profile_services (
      barber_profile_id, service_id, duration_override_minutes,
      price_override_cents, active, created_at
    )
    select v_canonical_id, service_id, duration_override_minutes,
      price_override_cents, active, created_at
    from public.barber_profile_services
    where barber_profile_id = v_duplicate.id
    on conflict (barber_profile_id, service_id) do update set
      duration_override_minutes = coalesce(public.barber_profile_services.duration_override_minutes, excluded.duration_override_minutes),
      price_override_cents = coalesce(public.barber_profile_services.price_override_cents, excluded.price_override_cents),
      active = public.barber_profile_services.active or excluded.active;
    delete from public.barber_profile_services where barber_profile_id = v_duplicate.id;

    insert into public.barber_schedules (
      barber_user_id, barber_profile_id, location_id, weekday, starts_at,
      ends_at, active, effective_from, effective_to, created_at, updated_at
    )
    select coalesce(barber_user_id, v_duplicate.staff_user_id), v_canonical_id,
      location_id, weekday, starts_at, ends_at, active, effective_from,
      effective_to, created_at, updated_at
    from public.barber_schedules
    where barber_profile_id = v_duplicate.id
    on conflict (barber_profile_id, location_id, weekday, effective_from)
      where barber_profile_id is not null
    do update set
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      active = excluded.active,
      effective_to = excluded.effective_to,
      updated_at = timezone('utc', now());
    delete from public.barber_schedules where barber_profile_id = v_duplicate.id;

    update public.barber_breaks set barber_profile_id = v_canonical_id
      where barber_profile_id = v_duplicate.id;
    update public.barber_time_off set barber_profile_id = v_canonical_id
      where barber_profile_id = v_duplicate.id;
    update public.slot_holds set barber_profile_id = v_canonical_id
      where barber_profile_id = v_duplicate.id;
    update public.appointment_assignments set barber_profile_id = v_canonical_id
      where barber_profile_id = v_duplicate.id;
    update public.portfolio_items set barber_profile_id = v_canonical_id
      where barber_profile_id = v_duplicate.id;

    begin
      update public.appointments set barber_profile_id = v_canonical_id
        where barber_profile_id = v_duplicate.id;
    exception when exclusion_violation then
      v_merge_ok := false;
    end;

    insert into public.barber_images (
      barber_user_id, barber_profile_id, image_type, storage_path,
      width, height, object_position, alt_text, sort_order, active, created_at
    )
    select coalesce(barber_user_id, v_duplicate.staff_user_id), v_canonical_id,
      image_type, storage_path, width, height, object_position, alt_text,
      sort_order, active, created_at
    from public.barber_images
    where barber_profile_id = v_duplicate.id
    on conflict (barber_profile_id, image_type, storage_path) do update set
      width = excluded.width,
      height = excluded.height,
      object_position = excluded.object_position,
      alt_text = excluded.alt_text,
      active = excluded.active;
    delete from public.barber_images where barber_profile_id = v_duplicate.id;

    insert into public.barber_profile_settings (
      barber_profile_id, years_cutting, walk_ins, photo_provided,
      working_days, instagram_handle, instagram_status, intake_notes, updated_at
    )
    select v_canonical_id, years_cutting, walk_ins, photo_provided,
      working_days, instagram_handle, instagram_status, intake_notes, updated_at
    from public.barber_profile_settings
    where barber_profile_id = v_duplicate.id
    on conflict (barber_profile_id) do update set
      years_cutting = coalesce(public.barber_profile_settings.years_cutting, excluded.years_cutting),
      photo_provided = public.barber_profile_settings.photo_provided or excluded.photo_provided,
      working_days = case when public.barber_profile_settings.working_days = '{}'::jsonb then excluded.working_days else public.barber_profile_settings.working_days end,
      instagram_handle = coalesce(public.barber_profile_settings.instagram_handle, excluded.instagram_handle),
      intake_notes = public.barber_profile_settings.intake_notes || excluded.intake_notes,
      updated_at = timezone('utc', now());
    delete from public.barber_profile_settings where barber_profile_id = v_duplicate.id;

    if v_merge_ok then
      delete from public.barber_profiles where id = v_duplicate.id;
    else
      update public.barber_profiles
      set
        slug = 'legacy-ruben-' || left(replace(id::text, '-', ''), 16),
        active = false,
        featured = false,
        status = 'archived',
        updated_at = timezone('utc', now())
      where id = v_duplicate.id;
    end if;
  end loop;
end
$$;

-- Owner-confirmed profile fields. No unsupported years, languages, social link,
-- working days, or walk-in claim is invented.
insert into public.barber_profile_settings (
  barber_profile_id, years_cutting, walk_ins, photo_provided, working_days,
  instagram_handle, instagram_status, intake_notes
)
select
  bp.id,
  null,
  false,
  true,
  '{"en":"Pending owner schedule confirmation","es":"Pendiente de confirmación del horario del propietario"}'::jsonb,
  null,
  'not_provided',
  '{"owner":true,"bookableWhenSchedulePublished":true,"languageConfirmationRequired":true}'::jsonb
from public.barber_profiles bp
join public.businesses b on b.id = bp.business_id
where b.slug = 'luxury-barber-lounge' and bp.slug = 'ruben-diaz-jr'
on conflict (barber_profile_id) do update set
  photo_provided = true,
  working_days = excluded.working_days,
  intake_notes = public.barber_profile_settings.intake_notes || excluded.intake_notes,
  updated_at = timezone('utc', now());

-- Ruben is eligible for the standard menu. He becomes selectable as soon as an
-- owner-managed schedule is published; the migration intentionally invents no days.
insert into public.barber_profile_services (barber_profile_id, service_id, active)
select bp.id, s.id, true
from public.barber_profiles bp
join public.businesses b on b.id = bp.business_id
join public.services s on s.business_id = b.id
where b.slug = 'luxury-barber-lounge'
  and bp.slug = 'ruben-diaz-jr'
  and s.slug in ('haircut','skin-fade','beard','cut-and-beard','hot-towel-shave','kids-haircut','senior-haircut','line-up')
on conflict (barber_profile_id, service_id) do update set active = true;

-- Responsive media metadata for the complete active roster. Original files are
-- preserved separately; primary AVIF/WebP delivery paths are registered here.
with portraits(slug, source_width, source_height, card_position, mobile_position, profile_position) as (
  values
    ('ruben-diaz-jr', 1067, 1600, '50% 24%', '50% 22%', '50% 24%'),
    ('angelica-aquino', 1067, 1600, '50% 20%', '50% 18%', '50% 18%'),
    ('hommy-rivera', 1600, 1067, '50% 24%', '50% 24%', '50% 24%'),
    ('barber-los', 843, 1264, '50% 18%', '50% 18%', '50% 18%'),
    ('jose', 1067, 1600, '50% 18%', '50% 18%', '50% 18%'),
    ('elvis', 684, 1024, '50% 16%', '50% 16%', '50% 16%'),
    ('alfredo-hernandez-pollo', 1600, 1067, '50% 18%', '50% 18%', '50% 18%'),
    ('russ-hawkins', 1067, 1600, '50% 20%', '50% 20%', '50% 20%'),
    ('daniel-penalo', 1067, 1600, '50% 16%', '50% 16%', '50% 16%')
), outputs(image_type, folder, extension, width, height, sort_order, position_context) as (
  values
    ('original', 'originals', 'jpeg', null::integer, null::integer, 0, 'profile'),
    ('homepage', 'cards', 'webp', 720, 900, 10, 'card'),
    ('directory', 'cards', 'avif', 720, 900, 20, 'card'),
    ('profile', 'profiles', 'avif', 1200, 1500, 30, 'profile'),
    ('booking', 'booking', 'avif', 640, 800, 40, 'card'),
    ('mobile', 'mobile', 'avif', 540, 675, 50, 'mobile'),
    ('tablet', 'tablet', 'avif', 960, 1200, 60, 'card'),
    ('desktop', 'desktop', 'avif', 1200, 1500, 70, 'profile')
), roster as (
  select bp.id, bp.staff_user_id, bp.display_name, p.*, o.*
  from portraits p
  join public.barber_profiles bp on bp.slug = p.slug
  join public.businesses b on b.id = bp.business_id and b.slug = 'luxury-barber-lounge'
  cross join outputs o
)
insert into public.barber_images (
  barber_user_id, barber_profile_id, image_type, storage_path, width, height,
  object_position, alt_text, sort_order, active
)
select
  roster.staff_user_id,
  roster.id,
  roster.image_type,
  'media/barbers/' || roster.folder || '/' || roster.slug || '.' || roster.extension,
  case when roster.image_type = 'original' then roster.source_width else roster.width end,
  case when roster.image_type = 'original' then roster.source_height else roster.height end,
  jsonb_build_object(
    'desktop', case when roster.position_context = 'profile' then roster.profile_position else roster.card_position end,
    'mobile', roster.mobile_position
  ),
  jsonb_build_object(
    'en', roster.display_name || ' of Luxury Barber Lounge',
    'es', roster.display_name || ' de Luxury Barber Lounge'
  ),
  roster.sort_order,
  true
from roster
on conflict (barber_profile_id, image_type, storage_path) do update set
  barber_user_id = excluded.barber_user_id,
  width = excluded.width,
  height = excluded.height,
  object_position = excluded.object_position,
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order,
  active = true;

-- Safe public catalog RPC. It returns published catalog identifiers and display
-- fields only. It does not expose schedules, staff-user IDs, PII, or secrets.
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
            and bs.effective_from <= current_date
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
            and bs.effective_from <= current_date
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

revoke all on function public.get_public_booking_catalog() from public;
grant execute on function public.get_public_booking_catalog() to anon, authenticated, service_role;

comment on function public.get_public_booking_catalog() is
  'Privacy-safe read-only booking catalog. Does not expose staff user IDs, schedule rows, PII, or integration secrets.';

commit;
