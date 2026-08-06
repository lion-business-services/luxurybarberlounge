-- Luxury Barber Lounge booking infrastructure activation.
--
-- This migration intentionally contains no service, barber, price, or schedule
-- seed data. Authoritative client content is applied by
-- 202608060016_final_client_content_release.sql so an older launch snapshot
-- cannot overwrite the completed intake values.

begin;

insert into public.businesses (
  name, slug, legal_name, phone, email, website_url, timezone, default_language, status
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
  'active'
)
on conflict (slug) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  phone = excluded.phone,
  email = excluded.email,
  website_url = excluded.website_url,
  timezone = excluded.timezone,
  status = 'active';

with business_row as (
  select id from public.businesses where slug = 'luxury-barber-lounge'
)
insert into public.locations (
  business_id, name, slug, phone, email, address_line_1, city, region,
  postal_code, country_code, timezone, active
)
select
  id,
  'Northfield Lounge',
  'northfield',
  '609-384-5171',
  'info@theluxurybarberlounge.com',
  '801 Tilton Road, Suite 106',
  'Northfield',
  'NJ',
  '08225',
  'US',
  'America/New_York',
  true
from business_row
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
  select location.id
  from public.locations location
  join public.businesses business on business.id = location.business_id
  where business.slug = 'luxury-barber-lounge'
    and location.slug = 'northfield'
)
insert into public.location_settings (
  location_id, walk_ins_enabled, kiosk_enabled, max_queue_size,
  default_buffer_minutes, settings
)
select
  id,
  true,
  true,
  30,
  10,
  '{"booking_enabled":true,"queue_board_enabled":true,"authoritative_content_migration":"202608060016"}'::jsonb
from location_row
on conflict (location_id) do update set
  walk_ins_enabled = true,
  kiosk_enabled = true,
  max_queue_size = greatest(public.location_settings.max_queue_size, 30),
  settings = public.location_settings.settings || excluded.settings,
  updated_at = timezone('utc', now());

commit;
