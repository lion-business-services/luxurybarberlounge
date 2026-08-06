-- Luxury Barber Lounge production booking launch activation.
-- Backfills the minimum verified live catalog, service eligibility, and schedule
-- required for the public booking flow. Safe to re-run through normal migrations.

begin;

insert into public.businesses (name, slug, legal_name, phone, email, website_url, timezone, default_language, status)
values ('Luxury Barber Lounge','luxury-barber-lounge','Luxury Barber Lounge, LLC','609-384-5171','info@theluxurybarberlounge.com','https://theluxurybarberlounge.com','America/New_York','en','active')
on conflict (slug) do update set
  name=excluded.name,
  legal_name=excluded.legal_name,
  phone=excluded.phone,
  email=excluded.email,
  website_url=excluded.website_url,
  timezone=excluded.timezone,
  status='active';

with b as (select id from public.businesses where slug='luxury-barber-lounge')
insert into public.locations (business_id,name,slug,phone,email,address_line_1,city,region,postal_code,country_code,timezone,active)
select id,'Northfield Lounge','northfield','609-384-5171','info@theluxurybarberlounge.com','801 Tilton Road, Suite 106','Northfield','NJ','08225','US','America/New_York',true from b
on conflict (business_id,slug) do update set
  name=excluded.name,
  phone=excluded.phone,
  email=excluded.email,
  address_line_1=excluded.address_line_1,
  city=excluded.city,
  region=excluded.region,
  postal_code=excluded.postal_code,
  timezone=excluded.timezone,
  active=true;

with l as (
  select l.id from public.locations l join public.businesses b on b.id=l.business_id
  where b.slug='luxury-barber-lounge' and l.slug='northfield'
), schedule(weekday,opens_at,closes_at,closed) as (
  values
    (0,null::time,null::time,true),
    (1,null::time,null::time,true),
    (2,'09:00'::time,'19:00'::time,false),
    (3,'09:00'::time,'19:00'::time,false),
    (4,'09:00'::time,'20:00'::time,false),
    (5,'09:00'::time,'20:00'::time,false),
    (6,'08:00'::time,'18:00'::time,false)
)
insert into public.business_hours (location_id,weekday,opens_at,closes_at,closed)
select l.id,s.weekday,s.opens_at,s.closes_at,s.closed from l cross join schedule s
on conflict (location_id,weekday) do update set
  opens_at=excluded.opens_at,
  closes_at=excluded.closes_at,
  closed=excluded.closed;

with b as (select id from public.businesses where slug='luxury-barber-lounge'),
category_seed(slug,name,description,sort_order) as (
  values
    ('haircuts-fades', '{"en":"Haircuts & Fades","es":"Cortes y Fades"}'::jsonb, '{"en":"Precision cuts and fade work.","es":"Cortes de precisión y fades."}'::jsonb, 0),
    ('beard-shaves', '{"en":"Beard & Shaves","es":"Barba y Afeitado"}'::jsonb, '{"en":"Beard shaping and traditional shave rituals.","es":"Diseño de barba y rituales de afeitado."}'::jsonb, 1),
    ('grooming-finish', '{"en":"Grooming & Finish","es":"Grooming y Acabado"}'::jsonb, '{"en":"Complete premium grooming experiences.","es":"Experiencias premium de grooming completo."}'::jsonb, 2)
)
insert into public.service_categories (business_id,slug,name,description,sort_order,active)
select b.id,c.slug,c.name,c.description,c.sort_order,true from b cross join category_seed c
on conflict (business_id,slug) do update set
  name=excluded.name,
  description=excluded.description,
  sort_order=excluded.sort_order,
  active=true;

with b as (select id from public.businesses where slug='luxury-barber-lounge'),
service_seed(slug,category_slug,name,short_description,full_description,price_cents,duration_minutes,deposit_cents,sort_order,featured) as (
  values
    ('signature-haircut','haircuts-fades','{"en":"Signature Haircut","es":"Corte Signature"}'::jsonb,'{"en":"Consultation, precision cut, rinse, styling, and a finish built for your routine.","es":"Consulta, corte de precisión, enjuague, peinado y acabado para tu rutina."}'::jsonb,'{"en":"A tailored haircut built around head shape, growth pattern, texture, and daily styling.","es":"Un corte personalizado según forma, crecimiento, textura y rutina."}'::jsonb,4500,45,1500,0,true),
    ('fade-cut','haircuts-fades','{"en":"Fade Cut","es":"Corte Fade"}'::jsonb,'{"en":"A clean gradient with crisp edges and balanced shape.","es":"Un degradado limpio con bordes precisos y forma equilibrada."}'::jsonb,'{"en":"Low, mid, high, taper, or skin fade balanced with the top length and exact perimeter work.","es":"Fade bajo, medio, alto, taper o skin fade equilibrado con la parte superior."}'::jsonb,4500,45,1500,1,true),
    ('beard-trim','beard-shaves','{"en":"Beard Trim","es":"Recorte de Barba"}'::jsonb,'{"en":"Balanced length, clean perimeter, and a shape that supports the jaw.","es":"Largo equilibrado, contorno limpio y forma que favorece la mandíbula."}'::jsonb,'{"en":"A controlled beard trim with consultation, clipper or scissor shaping, neckline cleanup, and styling finish.","es":"Recorte controlado con consulta, forma, limpieza del cuello y acabado."}'::jsonb,2800,25,1000,2,true),
    ('hot-towel-shave','beard-shaves','{"en":"Hot Towel Shave","es":"Afeitado con Toalla Caliente"}'::jsonb,'{"en":"A traditional close shave with warm preparation and calming care.","es":"Afeitado tradicional al ras con preparación caliente y cuidado calmante."}'::jsonb,'{"en":"A classic barber ritual with hot towels, lather, razor work, cool finish, and hydration.","es":"Ritual clásico con toallas calientes, espuma, navaja, acabado frío e hidratación."}'::jsonb,5000,45,1500,3,true),
    ('groom-package','grooming-finish','{"en":"Executive Grooming Package","es":"Paquete Ejecutivo"}'::jsonb,'{"en":"Haircut, beard detail, hot towel, cleansing, and a complete finishing ritual.","es":"Corte, detalle de barba, toalla caliente, limpieza y ritual completo."}'::jsonb,'{"en":"A complete sitting for guests who want the full lounge experience in one coordinated appointment.","es":"Sesión completa para disfrutar toda la experiencia del lounge en una cita."}'::jsonb,10500,90,3000,4,true)
)
insert into public.services (
  business_id,category_id,slug,name,short_description,full_description,
  price_cents,starting_price,duration_minutes,deposit_cents,featured,bookable,
  content_status,active,sort_order
)
select b.id,c.id,s.slug,s.name,s.short_description,s.full_description,
  s.price_cents,true,s.duration_minutes,s.deposit_cents,s.featured,true,'published',true,s.sort_order
from b
join service_seed s on true
join public.service_categories c on c.business_id=b.id and c.slug=s.category_slug
on conflict (business_id,slug) do update set
  category_id=excluded.category_id,
  name=excluded.name,
  short_description=excluded.short_description,
  full_description=excluded.full_description,
  price_cents=excluded.price_cents,
  duration_minutes=excluded.duration_minutes,
  deposit_cents=excluded.deposit_cents,
  featured=excluded.featured,
  bookable=true,
  content_status='published',
  active=true,
  sort_order=excluded.sort_order;

with b as (select id from public.businesses where slug='luxury-barber-lounge')
insert into public.barber_profiles (
  business_id,slug,display_name,professional_title,short_intro,biography,story,
  specialties,languages,social_links,featured,active,demo,status,sort_order
)
select b.id,'ruben-diaz-jr','Rubén Díaz Jr.',
  '{"en":"Founder & Lead Barber","es":"Fundador y Barbero Principal"}'::jsonb,
  '{"en":"Precision-focused grooming with careful consultation and controlled detail.","es":"Grooming de precisión con consulta cuidadosa y detalle controlado."}'::jsonb,
  '{"en":"Rubén shapes a lounge where consultation, craft, atmosphere, and personal attention receive equal care.","es":"Rubén crea un lounge donde consulta, oficio, ambiente y atención personal reciben el mismo cuidado."}'::jsonb,
  '{"en":"Every appointment is built around a clear plan and a result designed for real life.","es":"Cada cita se basa en un plan claro y un resultado diseñado para la vida real."}'::jsonb,
  '["fade-cut","beard-trim","groom-package","hot-towel-shave"]'::jsonb,
  array['en','es']::text[],
  '{}'::jsonb,true,true,false,'published',1
from b
on conflict (business_id,slug) do update set
  display_name=excluded.display_name,
  professional_title=excluded.professional_title,
  short_intro=excluded.short_intro,
  biography=excluded.biography,
  story=excluded.story,
  specialties=excluded.specialties,
  languages=excluded.languages,
  featured=true,
  active=true,
  demo=false,
  status='published',
  sort_order=1;

with b as (select id from public.businesses where slug='luxury-barber-lounge'),
l as (
  select l.id from public.locations l join b on b.id=l.business_id where l.slug='northfield'
),
barber as (
  select bp.id from public.barber_profiles bp join b on b.id=bp.business_id where bp.slug='ruben-diaz-jr'
),
svc as (
  select s.id from public.services s join b on b.id=s.business_id
  where s.slug in ('signature-haircut','fade-cut','beard-trim','hot-towel-shave','groom-package')
)
insert into public.barber_profile_services (barber_profile_id,service_id,active)
select barber.id,svc.id,true from barber cross join svc
on conflict (barber_profile_id,service_id) do update set active=true;

with b as (select id from public.businesses where slug='luxury-barber-lounge'),
l as (
  select l.id from public.locations l join b on b.id=l.business_id where l.slug='northfield'
),
svc as (
  select s.id from public.services s join b on b.id=s.business_id
  where s.slug in ('signature-haircut','fade-cut','beard-trim','hot-towel-shave','groom-package')
)
insert into public.service_locations (service_id,location_id,active)
select svc.id,l.id,true from svc cross join l
on conflict (service_id,location_id) do update set active=true;

with b as (select id from public.businesses where slug='luxury-barber-lounge'),
l as (
  select l.id from public.locations l join b on b.id=l.business_id where l.slug='northfield'
),
barber as (
  select bp.id from public.barber_profiles bp join b on b.id=bp.business_id where bp.slug='ruben-diaz-jr'
),
schedule(weekday,starts_at,ends_at) as (
  values
    (2,'09:00'::time,'19:00'::time),
    (3,'09:00'::time,'19:00'::time),
    (4,'09:00'::time,'20:00'::time),
    (5,'09:00'::time,'20:00'::time),
    (6,'08:00'::time,'18:00'::time)
)
insert into public.barber_schedules (
  barber_user_id,barber_profile_id,location_id,weekday,starts_at,ends_at,active,effective_from,effective_to
)
select null,barber.id,l.id,s.weekday,s.starts_at,s.ends_at,true,current_date,null
from barber cross join l cross join schedule s
where not exists (
  select 1 from public.barber_schedules existing
  where existing.barber_profile_id=barber.id
    and existing.location_id=l.id
    and existing.weekday=s.weekday
    and existing.active=true
    and (existing.effective_to is null or existing.effective_to>=current_date)
);

with l as (
  select l.id from public.locations l join public.businesses b on b.id=l.business_id
  where b.slug='luxury-barber-lounge' and l.slug='northfield'
)
insert into public.location_settings (location_id,walk_ins_enabled,kiosk_enabled,max_queue_size,default_buffer_minutes,settings)
select l.id,true,true,30,10,'{"booking_enabled":true,"queue_board_enabled":true}'::jsonb from l
on conflict (location_id) do update set
  walk_ins_enabled=true,
  kiosk_enabled=true,
  max_queue_size=greatest(public.location_settings.max_queue_size,30),
  settings=public.location_settings.settings || excluded.settings,
  updated_at=timezone('utc',now());

commit;
