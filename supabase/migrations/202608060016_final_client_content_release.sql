-- Luxury Barber Lounge final client-intake content release.
-- Applies the authoritative roster, services, prices, hours, memberships,
-- packages, vouchers, walk-in rules, and confirmed barber schedules.

begin;

insert into public.businesses (
  name, slug, legal_name, phone, email, website_url, timezone,
  default_language, status, metadata
)
values (
  'Luxury Barber Lounge',
  'luxury-barber-lounge',
  'Luxury Barber Lounge, LLC',
  '609-384-5171',
  'info@theluxurybarberlounge.com',
  'https://www.theluxurybarberlounge.com',
  'America/New_York',
  'en',
  'active',
  '{"client_intake_version":"2026-08-06","deposit_percent":50,"kids_age_limit":10,"senior_age_threshold":55,"gift_cards":{"offered":true,"starting_amount_cents":5000},"color_service_offered":false}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  phone = excluded.phone,
  email = excluded.email,
  website_url = excluded.website_url,
  timezone = excluded.timezone,
  status = 'active',
  metadata = public.businesses.metadata || excluded.metadata;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
insert into public.locations (
  business_id, name, slug, phone, email, address_line_1, city, region,
  postal_code, country_code, timezone, active
)
select
  b.id, 'Northfield Lounge', 'northfield', '609-384-5171',
  'info@theluxurybarberlounge.com', '801 Tilton Road, Suite 106',
  'Northfield', 'NJ', '08225', 'US', 'America/New_York', true
from b
on conflict (business_id, slug) do update set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  address_line_1 = excluded.address_line_1,
  city = excluded.city,
  region = excluded.region,
  postal_code = excluded.postal_code,
  timezone = excluded.timezone,
  active = true;

with location_row as (
  select l.id
  from public.locations l
  join public.businesses b on b.id = l.business_id
  where b.slug = 'luxury-barber-lounge' and l.slug = 'northfield'
), intake_hours(weekday, opens_at, closes_at, closed) as (
  values
    (0, '09:00'::time, '16:00'::time, false),
    (1, null::time, null::time, true),
    (2, '08:00'::time, '21:00'::time, false),
    (3, '08:00'::time, '21:00'::time, false),
    (4, '08:00'::time, '21:00'::time, false),
    (5, '08:00'::time, '21:00'::time, false),
    (6, '08:00'::time, '21:00'::time, false)
)
insert into public.business_hours (location_id, weekday, opens_at, closes_at, closed)
select l.id, h.weekday, h.opens_at, h.closes_at, h.closed
from location_row l cross join intake_hours h
on conflict (location_id, weekday) do update set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  closed = excluded.closed;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), categories(slug, name, description, sort_order) as (
  values
    ('haircuts-fades', '{"en":"Haircuts & Fades","es":"Cortes y Fades"}'::jsonb, '{"en":"Haircuts, fades, line-ups, age-based cuts, and design work.","es":"Cortes, fades, line-ups, cortes por edad y disenos."}'::jsonb, 10),
    ('beard-shaves', '{"en":"Beard & Shaves","es":"Barba y Afeitados"}'::jsonb, '{"en":"Beard services, combined appointments, and hot-towel shaving.","es":"Servicios de barba, citas combinadas y afeitado con toalla caliente."}'::jsonb, 20),
    ('specialty', '{"en":"Specialty Services","es":"Servicios Especiales"}'::jsonb, '{"en":"Specialty services offered by eligible barbers.","es":"Servicios especiales ofrecidos por barberos elegibles."}'::jsonb, 30)
)
insert into public.service_categories (
  business_id, slug, name, description, sort_order, active
)
select b.id, c.slug, c.name, c.description, c.sort_order, true
from b cross join categories c
on conflict (business_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
update public.service_categories c
set active = false
from b
where c.business_id = b.id
  and c.slug not in ('haircuts-fades', 'beard-shaves', 'specialty');

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), service_seed(
  slug, category_slug, name, short_description, full_description,
  price_cents, starting_price, duration_minutes, deposit_cents,
  featured, sort_order
) as (
  values
    ('haircut', 'haircuts-fades', '{"en":"Haircut","es":"Corte"}'::jsonb, '{"en":"A full haircut appointment.","es":"Una cita completa de corte."}'::jsonb, '{"en":"A 60-minute haircut service offered by all active eligible barbers.","es":"Servicio de corte de 60 minutos ofrecido por barberos elegibles."}'::jsonb, 5000, false, 60, 2500, true, 10),
    ('skin-fade', 'haircuts-fades', '{"en":"Skin Fade","es":"Skin Fade"}'::jsonb, '{"en":"A focused skin-fade appointment.","es":"Una cita enfocada en skin fade."}'::jsonb, '{"en":"A 40-minute skin-fade service offered by all active eligible barbers.","es":"Servicio de skin fade de 40 minutos ofrecido por barberos elegibles."}'::jsonb, 5000, false, 40, 2500, true, 20),
    ('beard', 'beard-shaves', '{"en":"Beard","es":"Barba"}'::jsonb, '{"en":"A dedicated beard service.","es":"Un servicio dedicado de barba."}'::jsonb, '{"en":"A 25-minute beard service offered by all active eligible barbers.","es":"Servicio de barba de 25 minutos ofrecido por barberos elegibles."}'::jsonb, 1500, false, 25, 750, false, 30),
    ('cut-and-beard', 'beard-shaves', '{"en":"Cut + Beard","es":"Corte + Barba"}'::jsonb, '{"en":"Haircut and beard in one appointment.","es":"Corte y barba en una sola cita."}'::jsonb, '{"en":"A 60-minute haircut and beard service offered by all active eligible barbers.","es":"Servicio de corte y barba de 60 minutos ofrecido por barberos elegibles."}'::jsonb, 5000, false, 60, 2500, true, 40),
    ('hot-towel-shave', 'beard-shaves', '{"en":"Hot Towel Shave","es":"Afeitado con Toalla Caliente"}'::jsonb, '{"en":"A hot-towel shaving appointment.","es":"Una cita de afeitado con toalla caliente."}'::jsonb, '{"en":"A 40-minute hot-towel shave offered by all active eligible barbers.","es":"Afeitado con toalla caliente de 40 minutos ofrecido por barberos elegibles."}'::jsonb, 4500, false, 40, 2250, false, 50),
    ('kids-haircut', 'haircuts-fades', '{"en":"Kids Haircut","es":"Corte para Ninos"}'::jsonb, '{"en":"Kids pricing through age 10.","es":"Precio infantil hasta los 10 anos."}'::jsonb, '{"en":"A 40-minute kids haircut with a client-provided age limit of 10.","es":"Corte infantil de 40 minutos con limite de edad de 10."}'::jsonb, 3500, false, 40, 1750, false, 60),
    ('senior-haircut', 'haircuts-fades', '{"en":"Senior Haircut","es":"Corte para Adulto Mayor"}'::jsonb, '{"en":"Senior pricing beginning at age 55.","es":"Precio senior desde los 55 anos."}'::jsonb, '{"en":"A 35-minute senior haircut with a client-provided age threshold of 55.","es":"Corte senior de 35 minutos con edad minima de 55."}'::jsonb, 4000, false, 35, 2000, false, 70),
    ('line-up', 'haircuts-fades', '{"en":"Line-Up","es":"Line-Up"}'::jsonb, '{"en":"A dedicated line-up appointment.","es":"Una cita dedicada de line-up."}'::jsonb, '{"en":"A 20-minute line-up service offered by all active eligible barbers.","es":"Servicio de line-up de 20 minutos ofrecido por barberos elegibles."}'::jsonb, 2500, false, 20, 1250, false, 80),
    ('design', 'specialty', '{"en":"Design","es":"Diseno"}'::jsonb, '{"en":"Custom design service offered by Barber Lo''s.","es":"Servicio de diseno ofrecido por Barber Lo''s."}'::jsonb, '{"en":"A 60-minute design service starting at $150.","es":"Servicio de diseno de 60 minutos desde $150."}'::jsonb, 15000, true, 60, 7500, false, 90)
)
insert into public.services (
  business_id, category_id, slug, name, short_description,
  full_description, price_cents, starting_price, duration_minutes,
  deposit_cents, benefits, preparation, featured, bookable,
  content_status, active, sort_order
)
select
  b.id, c.id, s.slug, s.name, s.short_description, s.full_description,
  s.price_cents, s.starting_price, s.duration_minutes, s.deposit_cents,
  '[{"en":"Service time reserved for the selected appointment","es":"Tiempo reservado para la cita seleccionada"}]'::jsonb,
  '{"en":"Bring a reference image if helpful.","es":"Trae una imagen de referencia si ayuda."}'::jsonb,
  s.featured, true, 'published', true, s.sort_order
from b
join service_seed s on true
join public.service_categories c on c.business_id = b.id and c.slug = s.category_slug
on conflict (business_id, slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  price_cents = excluded.price_cents,
  starting_price = excluded.starting_price,
  duration_minutes = excluded.duration_minutes,
  deposit_cents = excluded.deposit_cents,
  benefits = excluded.benefits,
  preparation = excluded.preparation,
  featured = excluded.featured,
  bookable = true,
  content_status = 'published',
  active = true,
  sort_order = excluded.sort_order;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
update public.services s
set active = false, bookable = false, content_status = 'archived'
from b
where s.business_id = b.id
  and s.slug not in (
    'haircut', 'skin-fade', 'beard', 'cut-and-beard',
    'hot-towel-shave', 'kids-haircut', 'senior-haircut',
    'line-up', 'design'
  );

create table if not exists public.barber_profile_settings (
  barber_profile_id uuid primary key references public.barber_profiles(id) on delete cascade,
  years_cutting text,
  walk_ins boolean not null default true,
  photo_provided boolean not null default false,
  working_days jsonb not null default '{}'::jsonb,
  instagram_handle text,
  instagram_status text not null default 'not_provided'
    check (instagram_status in ('active', 'pending_confirmation', 'not_provided')),
  intake_notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.barber_profile_settings enable row level security;

drop policy if exists barber_profile_settings_public_read on public.barber_profile_settings;
create policy barber_profile_settings_public_read
on public.barber_profile_settings for select
using (
  exists (
    select 1 from public.barber_profiles bp
    where bp.id = barber_profile_id and bp.active and bp.status = 'published'
  )
);

drop policy if exists barber_profile_settings_staff_manage on public.barber_profile_settings;
create policy barber_profile_settings_staff_manage
on public.barber_profile_settings for all
using (
  exists (
    select 1 from public.barber_profiles bp
    where bp.id = barber_profile_id and public.can_manage_business(bp.business_id)
  )
)
with check (
  exists (
    select 1 from public.barber_profiles bp
    where bp.id = barber_profile_id and public.can_manage_business(bp.business_id)
  )
);

-- Preserve historical profile identifiers by renaming legacy rows in place when
-- a destination profile does not already exist.
with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), mapping(legacy_slug, current_slug, display_name) as (
  values
    ('amaya' || '-' || 'reyes', 'angelica-aquino', 'Angelica Aquino'),
    ('adrian' || '-' || 'cole', 'hommy-rivera', 'Hommy Rivera'),
    ('mateo' || '-' || 'cruz', 'barber-los', 'Barber Lo''s'),
    ('julian' || '-' || 'vega', 'jose', 'Jose'),
    ('elias' || '-' || 'moreno', 'elvis', 'Elvis'),
    ('nico' || '-' || 'santos', 'alfredo-hernandez-pollo', 'Alfredo Hernandez (Pollo)'),
    ('marcus' || '-' || 'bennett', 'russ-hawkins', 'Russ Hawkins'),
    ('andre' || '-' || 'silva', 'daniel-penalo', 'Daniel Penalo')
)
update public.barber_profiles bp
set slug = m.current_slug, display_name = m.display_name
from b, mapping m
where bp.business_id = b.id
  and bp.slug = m.legacy_slug
  and not exists (
    select 1 from public.barber_profiles current_profile
    where current_profile.business_id = b.id
      and current_profile.slug = m.current_slug
  );

-- If both a legacy row and a canonical row already exist, keep the legacy UUID
-- for historical foreign keys but remove the obsolete public identity and slug.
with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), mapping(legacy_slug, current_slug, display_name) as (
  values
    ('amaya' || '-' || 'reyes', 'angelica-aquino', 'Angelica Aquino'),
    ('adrian' || '-' || 'cole', 'hommy-rivera', 'Hommy Rivera'),
    ('mateo' || '-' || 'cruz', 'barber-los', 'Barber Lo''s'),
    ('julian' || '-' || 'vega', 'jose', 'Jose'),
    ('elias' || '-' || 'moreno', 'elvis', 'Elvis'),
    ('nico' || '-' || 'santos', 'alfredo-hernandez-pollo', 'Alfredo Hernandez (Pollo)'),
    ('marcus' || '-' || 'bennett', 'russ-hawkins', 'Russ Hawkins'),
    ('andre' || '-' || 'silva', 'daniel-penalo', 'Daniel Penalo')
)
update public.barber_profiles legacy_profile
set
  slug = 'legacy-identity-' || left(replace(legacy_profile.id::text, '-', ''), 16),
  display_name = m.display_name,
  active = false,
  featured = false,
  status = 'archived'
from b, mapping m
where legacy_profile.business_id = b.id
  and legacy_profile.slug = m.legacy_slug
  and exists (
    select 1 from public.barber_profiles current_profile
    where current_profile.business_id = b.id
      and current_profile.slug = m.current_slug
  );

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), roster(
  slug, display_name, title, intro, biography, story, specialties,
  languages, social_links, featured, sort_order
) as (
  values
    ('angelica-aquino', 'Angelica Aquino', '{"en":"Manager","es":"Gerente"}'::jsonb, '{"en":"Clean cuts. Sharp fades. Quality service. Book your appointment and leave looking your best.","es":"Cortes limpios, fades precisos y servicio de calidad."}'::jsonb, '{"en":"Clean cuts. Sharp fades. Quality service. Book your appointment and leave looking your best.","es":"Cortes limpios, fades precisos y servicio de calidad."}'::jsonb, '{"en":"Manager offering all types of haircuts.","es":"Gerente que ofrece todo tipo de cortes."}'::jsonb, '["all types of haircuts"]'::jsonb, array['en','es']::text[], '{"instagram":"https://instagram.com/angelicutz_","instagramHandle":"angelicutz_"}'::jsonb, true, 10),
    ('hommy-rivera', 'Hommy Rivera', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Experienced bilingual barber offering all types of haircuts.","es":"Barbero bilingue con experiencia en todo tipo de cortes."}'::jsonb, '{"en":"13 years cutting. Tuesday through Sunday.","es":"13 anos cortando. Martes a domingo."}'::jsonb, '{"en":"All types of haircuts.","es":"Todo tipo de cortes."}'::jsonb, '["all types of haircuts"]'::jsonb, array['es','en']::text[], '{"instagram":"https://instagram.com/Cutzby_hommy","instagramHandle":"Cutzby_hommy"}'::jsonb, true, 20),
    ('barber-los', 'Barber Lo''s', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Bilingual barber offering all types of haircuts and designs.","es":"Barbero bilingue que ofrece cortes y disenos."}'::jsonb, '{"en":"All types of haircuts and designs. Schedule details remain pending confirmation.","es":"Todo tipo de cortes y disenos. El horario esta pendiente."}'::jsonb, '{"en":"Confirmed design-service provider.","es":"Proveedor confirmado para disenos."}'::jsonb, '["all types of haircuts","designs"]'::jsonb, array['es','en']::text[], '{"instagramStatus":"not_provided"}'::jsonb, false, 30),
    ('jose', 'Jose', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Detailed haircuts, crispy fades, and sharp hairlines.","es":"Cortes detallados, fades precisos y lineas definidas."}'::jsonb, '{"en":"12+ years cutting. Hot towel services and facials. Tuesday through Saturday.","es":"Mas de 12 anos cortando. Toalla caliente y faciales. Martes a sabado."}'::jsonb, '{"en":"Detailed haircuts, crispy fades, and sharp hairlines.","es":"Cortes detallados, fades precisos y lineas definidas."}'::jsonb, '["hot towel services","facials"]'::jsonb, array['en','es']::text[], '{"instagramStatus":"pending_confirmation"}'::jsonb, false, 40),
    ('elvis', 'Elvis', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Premium cuts, precision fades, and elevated style.","es":"Cortes premium, fades de precision y estilo elevado."}'::jsonb, '{"en":"Fluffy texture and fringe. Tuesday through Sunday.","es":"Textura fluffy y fringe. Martes a domingo."}'::jsonb, '{"en":"Premium cuts, precision fades, and elevated style.","es":"Cortes premium, fades de precision y estilo elevado."}'::jsonb, '["fluffy texture","fringe"]'::jsonb, array['en','es']::text[], '{"instagramStatus":"pending_confirmation"}'::jsonb, false, 50),
    ('alfredo-hernandez-pollo', 'Alfredo Hernandez (Pollo)', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Bilingual barber offering all types of haircuts.","es":"Barbero bilingue que ofrece todo tipo de cortes."}'::jsonb, '{"en":"3 years cutting. Tuesday through Saturday.","es":"3 anos cortando. Martes a sabado."}'::jsonb, '{"en":"All types of haircuts.","es":"Todo tipo de cortes."}'::jsonb, '["all types of haircuts"]'::jsonb, array['en','es']::text[], '{"instagramHandle":"Pollo.da.barber","instagramStatus":"pending_confirmation"}'::jsonb, false, 60),
    ('russ-hawkins', 'Russ Hawkins', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Experienced English-speaking barber offering all types of haircuts.","es":"Barbero con experiencia que ofrece todo tipo de cortes en ingles."}'::jsonb, '{"en":"10 years cutting. Tuesday through Saturday.","es":"10 anos cortando. Martes a sabado."}'::jsonb, '{"en":"All types of haircuts.","es":"Todo tipo de cortes."}'::jsonb, '["all types of haircuts"]'::jsonb, array['en']::text[], '{"instagramStatus":"pending_confirmation"}'::jsonb, false, 70),
    ('daniel-penalo', 'Daniel Penalo', '{"en":"Barber","es":"Barbero"}'::jsonb, '{"en":"Experienced Spanish-speaking barber offering all types of haircuts.","es":"Barbero con experiencia que ofrece todo tipo de cortes en espanol."}'::jsonb, '{"en":"14 years cutting. Tuesday through Saturday.","es":"14 anos cortando. Martes a sabado."}'::jsonb, '{"en":"All types of haircuts.","es":"Todo tipo de cortes."}'::jsonb, '["all types of haircuts"]'::jsonb, array['es']::text[], '{"instagram":"https://instagram.com/daniel.barbershop97","instagramHandle":"daniel.barbershop97"}'::jsonb, false, 80)
)
insert into public.barber_profiles (
  business_id, slug, display_name, professional_title, short_intro,
  biography, story, specialties, languages, social_links, featured,
  active, demo, status, sort_order
)
select
  b.id, r.slug, r.display_name, r.title, r.intro, r.biography, r.story,
  r.specialties, r.languages, r.social_links, r.featured,
  true, false, 'published', r.sort_order
from b cross join roster r
on conflict (business_id, slug) do update set
  display_name = excluded.display_name,
  professional_title = excluded.professional_title,
  short_intro = excluded.short_intro,
  biography = excluded.biography,
  story = excluded.story,
  specialties = excluded.specialties,
  languages = excluded.languages,
  social_links = excluded.social_links,
  featured = excluded.featured,
  active = true,
  demo = false,
  status = 'published',
  sort_order = excluded.sort_order;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
update public.barber_profiles bp
set active = false, featured = false
from b
where bp.business_id = b.id
  and bp.slug not in (
    'angelica-aquino', 'hommy-rivera', 'barber-los', 'jose', 'elvis',
    'alfredo-hernandez-pollo', 'russ-hawkins', 'daniel-penalo'
  );

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), settings(
  slug, years_cutting, walk_ins, photo_provided, working_days,
  instagram_handle, instagram_status, intake_notes
) as (
  values
    ('angelica-aquino', '3', true, true, '{"en":"Wednesday confirmed; remaining range pending","es":"Miercoles confirmado; rango restante pendiente"}'::jsonb, 'angelicutz_', 'active', '{"schedule_uncertainty":"Handwritten end day is unclear."}'::jsonb),
    ('hommy-rivera', '13', true, true, '{"en":"Tuesday through Sunday","es":"Martes a domingo"}'::jsonb, 'Cutzby_hommy', 'active', '{}'::jsonb),
    ('barber-los', null, false, true, '{"en":"Pending owner confirmation","es":"Pendiente de confirmacion"}'::jsonb, null, 'not_provided', '{"years_cutting":"pending","working_days":"pending","instagram":"pending"}'::jsonb),
    ('jose', '12+', true, true, '{"en":"Tuesday through Saturday","es":"Martes a sabado"}'::jsonb, null, 'pending_confirmation', '{"instagram":"Verify before activation."}'::jsonb),
    ('elvis', null, true, true, '{"en":"Tuesday through Sunday","es":"Martes a domingo"}'::jsonb, null, 'pending_confirmation', '{"instagram":"Verify before activation."}'::jsonb),
    ('alfredo-hernandez-pollo', '3', true, true, '{"en":"Tuesday through Saturday","es":"Martes a sabado"}'::jsonb, 'Pollo.da.barber', 'pending_confirmation', '{"instagram":"Confirm exact punctuation before activation."}'::jsonb),
    ('russ-hawkins', '10', true, true, '{"en":"Tuesday through Saturday","es":"Martes a sabado"}'::jsonb, null, 'pending_confirmation', '{"instagram":"Verify before activation."}'::jsonb),
    ('daniel-penalo', '14', true, true, '{"en":"Tuesday through Saturday","es":"Martes a sabado"}'::jsonb, 'daniel.barbershop97', 'active', '{}'::jsonb)
)
insert into public.barber_profile_settings (
  barber_profile_id, years_cutting, walk_ins, photo_provided, working_days,
  instagram_handle, instagram_status, intake_notes
)
select
  bp.id, s.years_cutting, s.walk_ins, s.photo_provided, s.working_days,
  s.instagram_handle, s.instagram_status, s.intake_notes
from settings s
join public.barber_profiles bp on bp.slug = s.slug
join b on b.id = bp.business_id
on conflict (barber_profile_id) do update set
  years_cutting = excluded.years_cutting,
  walk_ins = excluded.walk_ins,
  photo_provided = excluded.photo_provided,
  working_days = excluded.working_days,
  instagram_handle = excluded.instagram_handle,
  instagram_status = excluded.instagram_status,
  intake_notes = excluded.intake_notes,
  updated_at = timezone('utc', now());

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
update public.barber_profile_services bps
set active = false
from public.barber_profiles bp, b
where bps.barber_profile_id = bp.id and bp.business_id = b.id;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), standard_barbers as (
  select id from public.barber_profiles
  where business_id = (select id from b)
    and slug in (
      'angelica-aquino', 'hommy-rivera', 'barber-los', 'jose', 'elvis',
      'alfredo-hernandez-pollo', 'russ-hawkins', 'daniel-penalo'
    )
), standard_services as (
  select id from public.services
  where business_id = (select id from b)
    and slug in (
      'haircut', 'skin-fade', 'beard', 'cut-and-beard',
      'hot-towel-shave', 'kids-haircut', 'senior-haircut', 'line-up'
    )
)
insert into public.barber_profile_services (barber_profile_id, service_id, active)
select bp.id, s.id, true
from standard_barbers bp cross join standard_services s
on conflict (barber_profile_id, service_id) do update set active = true;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), target_barber as (
  select id from public.barber_profiles
  where business_id = (select id from b) and slug = 'barber-los'
), target_service as (
  select id from public.services
  where business_id = (select id from b) and slug = 'design'
)
insert into public.barber_profile_services (barber_profile_id, service_id, active)
select bp.id, s.id, true
from target_barber bp cross join target_service s
on conflict (barber_profile_id, service_id) do update set active = true;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), l as (
  select id from public.locations
  where business_id = (select id from b) and slug = 'northfield'
), s as (
  select id from public.services
  where business_id = (select id from b)
    and slug in (
      'haircut', 'skin-fade', 'beard', 'cut-and-beard',
      'hot-towel-shave', 'kids-haircut', 'senior-haircut',
      'line-up', 'design'
    )
)
insert into public.service_locations (service_id, location_id, active)
select s.id, l.id, true from s cross join l
on conflict (service_id, location_id) do update set active = true;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), roster as (
  select id from public.barber_profiles
  where business_id = (select id from b)
    and slug in (
      'angelica-aquino', 'hommy-rivera', 'barber-los', 'jose', 'elvis',
      'alfredo-hernandez-pollo', 'russ-hawkins', 'daniel-penalo'
    )
)
update public.barber_schedules schedule
set active = false, effective_to = current_date
from roster
where schedule.barber_profile_id = roster.id and schedule.active = true;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), l as (
  select id from public.locations
  where business_id = (select id from b) and slug = 'northfield'
), schedule_seed(slug, weekday, starts_at, ends_at) as (
  values
    ('angelica-aquino', 3, '08:00'::time, '21:00'::time),
    ('hommy-rivera', 0, '09:00'::time, '16:00'::time),
    ('hommy-rivera', 2, '08:00'::time, '21:00'::time),
    ('hommy-rivera', 3, '08:00'::time, '21:00'::time),
    ('hommy-rivera', 4, '08:00'::time, '21:00'::time),
    ('hommy-rivera', 5, '08:00'::time, '21:00'::time),
    ('hommy-rivera', 6, '08:00'::time, '21:00'::time),
    ('jose', 2, '08:00'::time, '21:00'::time),
    ('jose', 3, '08:00'::time, '21:00'::time),
    ('jose', 4, '08:00'::time, '21:00'::time),
    ('jose', 5, '08:00'::time, '21:00'::time),
    ('jose', 6, '08:00'::time, '21:00'::time),
    ('elvis', 0, '09:00'::time, '16:00'::time),
    ('elvis', 2, '08:00'::time, '21:00'::time),
    ('elvis', 3, '08:00'::time, '21:00'::time),
    ('elvis', 4, '08:00'::time, '21:00'::time),
    ('elvis', 5, '08:00'::time, '21:00'::time),
    ('elvis', 6, '08:00'::time, '21:00'::time),
    ('alfredo-hernandez-pollo', 2, '08:00'::time, '21:00'::time),
    ('alfredo-hernandez-pollo', 3, '08:00'::time, '21:00'::time),
    ('alfredo-hernandez-pollo', 4, '08:00'::time, '21:00'::time),
    ('alfredo-hernandez-pollo', 5, '08:00'::time, '21:00'::time),
    ('alfredo-hernandez-pollo', 6, '08:00'::time, '21:00'::time),
    ('russ-hawkins', 2, '08:00'::time, '21:00'::time),
    ('russ-hawkins', 3, '08:00'::time, '21:00'::time),
    ('russ-hawkins', 4, '08:00'::time, '21:00'::time),
    ('russ-hawkins', 5, '08:00'::time, '21:00'::time),
    ('russ-hawkins', 6, '08:00'::time, '21:00'::time),
    ('daniel-penalo', 2, '08:00'::time, '21:00'::time),
    ('daniel-penalo', 3, '08:00'::time, '21:00'::time),
    ('daniel-penalo', 4, '08:00'::time, '21:00'::time),
    ('daniel-penalo', 5, '08:00'::time, '21:00'::time),
    ('daniel-penalo', 6, '08:00'::time, '21:00'::time)
)
insert into public.barber_schedules (
  barber_user_id, barber_profile_id, location_id, weekday,
  starts_at, ends_at, active, effective_from, effective_to
)
select
  null, bp.id, l.id, s.weekday, s.starts_at, s.ends_at,
  true, current_date, null
from schedule_seed s
join public.barber_profiles bp
  on bp.business_id = (select id from b) and bp.slug = s.slug
cross join l
on conflict (barber_profile_id, location_id, weekday, effective_from)
where barber_profile_id is not null
do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  active = true,
  effective_to = null;

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), plans(
  slug, name, description, price_cents, billing_interval,
  included_services, benefits, usage_rules, featured
) as (
  values
    ('annual-52-week', '{"en":"1 Year Membership","es":"Membresia de 1 Ano"}'::jsonb, '{"en":"Owner-provided 52-week membership.","es":"Membresia de 52 semanas provista por el propietario."}'::jsonb, 130000, 'one_time', '[{"name":"Full haircut and beard plus hot towel"}]'::jsonb, '[{"en":"Full haircut and beard plus hot towel","es":"Corte completo y barba mas toalla caliente"}]'::jsonb, '{"duration_weeks":52,"terms_version":"2026-08-06"}'::jsonb, false),
    ('monthly-4-week', '{"en":"1 Month Membership","es":"Membresia de 1 Mes"}'::jsonb, '{"en":"Owner-provided 4-week membership.","es":"Membresia de 4 semanas provista por el propietario."}'::jsonb, 15000, 'one_time', '[{"name":"Full haircut and beard plus hot towel"}]'::jsonb, '[{"en":"Full haircut and beard plus hot towel","es":"Corte completo y barba mas toalla caliente"}]'::jsonb, '{"duration_weeks":4,"terms_version":"2026-08-06"}'::jsonb, true)
)
insert into public.membership_plans (
  business_id, slug, name, description, price_cents, billing_interval,
  included_services, benefits, usage_rules, pause_rules,
  cancellation_rules, active, featured, demo, status
)
select
  b.id, p.slug, p.name, p.description, p.price_cents, p.billing_interval,
  p.included_services, p.benefits, p.usage_rules,
  '{"owner_confirmation_required":true}'::jsonb,
  '{"owner_confirmation_required":true}'::jsonb,
  true, p.featured, false, 'published'
from b cross join plans p
on conflict (business_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  included_services = excluded.included_services,
  benefits = excluded.benefits,
  usage_rules = excluded.usage_rules,
  active = true,
  featured = excluded.featured,
  demo = false,
  status = 'published';

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
update public.membership_plans plan
set active = false, featured = false, status = 'archived'
from b
where plan.business_id = b.id
  and plan.slug not in ('annual-52-week', 'monthly-4-week');

insert into public.membership_plan_versions (
  plan_id, version, name, description, price_cents, billing_interval,
  benefits, usage_rules, status, effective_from
)
select
  plan.id, 1, plan.name, plan.description, plan.price_cents,
  plan.billing_interval, plan.benefits, plan.usage_rules,
  'active', timezone('utc', now())
from public.membership_plans plan
join public.businesses b on b.id = plan.business_id
where b.slug = 'luxury-barber-lounge'
  and plan.slug in ('annual-52-week', 'monthly-4-week')
on conflict (plan_id, version) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  benefits = excluded.benefits,
  usage_rules = excluded.usage_rules,
  status = 'active';

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
update public.packages p
set status = 'archived'
from b
where p.business_id = b.id and p.status <> 'archived';

with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
), package_seed(name, description, price_cents) as (
  values
    ('{"en":"Executive Grooming","es":"Grooming Ejecutivo"}'::jsonb, '{"en":"Full haircut, beard, shampoo, and hot towel.","es":"Corte completo, barba, champu y toalla caliente."}'::jsonb, 17500),
    ('{"en":"Father & Son","es":"Padre e Hijo"}'::jsonb, '{"en":"Regular haircut.","es":"Corte regular."}'::jsonb, 7000),
    ('{"en":"Wedding / Event","es":"Boda / Evento"}'::jsonb, '{"en":"Full haircut, beard, shampoo, hot towel, regular facial, and photo.","es":"Corte completo, barba, champu, toalla caliente, facial regular y foto."}'::jsonb, 70000)
)
insert into public.packages (
  business_id, name, description, price_cents, visits,
  per_visit_value_cents, status
)
select b.id, p.name, p.description, p.price_cents, 1, p.price_cents, 'active'
from b cross join package_seed p;

with location_row as (
  select l.id
  from public.locations l
  join public.businesses b on b.id = l.business_id
  where b.slug = 'luxury-barber-lounge' and l.slug = 'northfield'
)
insert into public.location_settings (
  location_id, walk_ins_enabled, kiosk_enabled, max_queue_size,
  default_buffer_minutes, settings
)
select
  l.id, true, true, 30, 10,
  '{"booking_enabled":true,"queue_board_enabled":true,"walk_ins_any_open_time":true,"deposit_percent":50,"kids_age_limit":10,"senior_age_threshold":55,"gift_cards":{"offered":true,"starting_amount_cents":5000},"color_service_offered":false,"client_intake_version":"2026-08-06"}'::jsonb
from location_row l
on conflict (location_id) do update set
  walk_ins_enabled = true,
  kiosk_enabled = true,
  max_queue_size = greatest(public.location_settings.max_queue_size, 30),
  settings = public.location_settings.settings || excluded.settings,
  updated_at = timezone('utc', now());

commit;
