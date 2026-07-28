-- Luxury Barber Lounge: services, Square references, booking extensions, and walk-in queue.

begin;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  slug text not null,
  name jsonb not null,
  short_description jsonb not null default '{}'::jsonb,
  full_description jsonb not null default '{}'::jsonb,
  price_cents integer check (price_cents is null or price_cents >= 0),
  starting_price boolean not null default true,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  deposit_cents integer check (deposit_cents is null or deposit_cents >= 0),
  image_path text,
  video_path text,
  benefits jsonb not null default '[]'::jsonb,
  preparation jsonb not null default '[]'::jsonb,
  maintenance_interval_days integer check (maintenance_interval_days is null or maintenance_interval_days > 0),
  seo jsonb not null default '{}'::jsonb,
  square_catalog_id text,
  featured boolean not null default false,
  bookable boolean not null default true,
  content_status public.record_status not null default 'draft',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.service_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price_cents integer not null default 0 check (price_cents >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  square_catalog_id text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.staff_services (
  staff_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  price_override_cents integer check (price_override_cents is null or price_override_cents >= 0),
  duration_override_minutes integer check (duration_override_minutes is null or duration_override_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (staff_user_id, service_id)
);

create table if not exists public.service_locations (
  service_id uuid not null references public.services(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (service_id, location_id)
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  staff_user_id uuid references public.staff_profiles(user_id) on delete cascade,
  name text not null,
  rule_type text not null check (rule_type in ('fixed','percentage','time_window','promotion')),
  amount_cents integer,
  percentage numeric(7,4),
  conditions jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.square_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  square_id text not null,
  name text,
  status text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_team_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_user_id uuid references public.staff_profiles(user_id) on delete set null,
  square_id text not null,
  display_name text,
  status text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_catalog_objects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  addon_id uuid references public.service_addons(id) on delete set null,
  square_id text not null,
  object_type text,
  version bigint,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  square_id text not null,
  email citext,
  phone text,
  display_name text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  square_id text not null,
  square_customer_id text,
  square_team_member_id text,
  status text,
  starts_at timestamptz,
  duration_minutes integer,
  version bigint,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_id text not null,
  location_square_id text,
  customer_square_id text,
  state text,
  total_cents integer,
  tax_cents integer,
  discount_cents integer,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_id text not null,
  square_order_id text,
  square_customer_id text,
  status text,
  amount_cents integer not null default 0,
  tip_cents integer not null default 0,
  processing_fee_cents integer not null default 0,
  card_brand text,
  created_at_square timestamptz,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_refunds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_id text not null,
  square_payment_id text not null,
  status text,
  amount_cents integer not null default 0,
  reason text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_id)
);

create table if not exists public.square_sync_state (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  resource_type text not null,
  cursor text,
  last_synced_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  status text not null default 'idle' check (status in ('idle','running','healthy','degraded','failed')),
  metadata jsonb not null default '{}'::jsonb,
  unique (business_id, resource_type)
);

create table if not exists public.booking_metadata (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_booking_id text,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  source text,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  service_snapshot jsonb not null default '{}'::jsonb,
  addon_snapshot jsonb not null default '[]'::jsonb,
  policy_version text,
  deposit_status text,
  reference_code text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.booking_attributions (
  id uuid primary key default gen_random_uuid(),
  booking_metadata_id uuid not null references public.booking_metadata(id) on delete cascade,
  attribution_type text not null check (attribution_type in ('SHOP','BARBER','EXCEPTION')),
  source text not null,
  client_response jsonb not null default '{}'::jsonb,
  referral_code text,
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'default' check (confidence in ('locked','verified','inferred','default')),
  rule_version integer not null default 1,
  locked_at timestamptz,
  override_reason text,
  override_actor uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointment_notes (
  id uuid primary key default gen_random_uuid(),
  booking_metadata_id uuid not null references public.booking_metadata(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  note text not null,
  client_visible boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointment_reference_images (
  id uuid primary key default gen_random_uuid(),
  booking_metadata_id uuid not null references public.booking_metadata(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  alt_text text,
  status text not null default 'active' check (status in ('active','hidden','deleted')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.appointment_status_history (
  id bigint generated always as identity primary key,
  booking_metadata_id uuid not null references public.booking_metadata(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.walkin_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  status text not null default 'open' check (status in ('open','paused','closed')),
  opened_by uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  settings_snapshot jsonb not null default '{}'::jsonb
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  walkin_session_id uuid references public.walkin_sessions(id) on delete set null,
  client_id uuid references public.client_profiles(user_id) on delete set null,
  client_name text,
  client_phone text,
  service_id uuid references public.services(id) on delete set null,
  service_slug text,
  preferred_barber_id uuid references public.staff_profiles(user_id) on delete set null,
  barber_preference text,
  public_token text not null unique,
  status text not null default 'waiting' check (status in ('waiting','confirmed','called','checked_in','in_service','completed','cancelled','no_show')),
  estimated_wait_minutes integer check (estimated_wait_minutes is null or estimated_wait_minutes >= 0),
  manual_priority integer not null default 100,
  attribution_source text not null default 'walk_in',
  metadata jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default timezone('utc', now()),
  called_at timestamptz,
  service_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (service_id is not null or service_slug is not null)
);

create table if not exists public.queue_assignments (
  id uuid primary key default gen_random_uuid(),
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  reason text,
  active boolean not null default true,
  assigned_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz
);

create table if not exists public.queue_status_history (
  id bigint generated always as identity primary key,
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_services_business_category on public.services (business_id, category_id, active, sort_order);
create index if not exists idx_services_square_catalog on public.services (square_catalog_id) where square_catalog_id is not null;
create index if not exists idx_staff_services_service on public.staff_services (service_id, active);
create index if not exists idx_square_bookings_start on public.square_bookings (business_id, starts_at);
create index if not exists idx_square_payments_created on public.square_payments (business_id, created_at_square desc);
create index if not exists idx_booking_metadata_client on public.booking_metadata (client_user_id, created_at desc);
create index if not exists idx_booking_metadata_barber on public.booking_metadata (barber_user_id, created_at desc);
create index if not exists idx_queue_location_status on public.queue_entries (location_id, status, manual_priority, joined_at);
create index if not exists idx_queue_barber_status on public.queue_entries (preferred_barber_id, status, joined_at);

drop trigger if exists service_categories_updated_at on public.service_categories;
create trigger service_categories_updated_at before update on public.service_categories for each row execute function public.set_updated_at();
drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists service_addons_updated_at on public.service_addons;
create trigger service_addons_updated_at before update on public.service_addons for each row execute function public.set_updated_at();
drop trigger if exists pricing_rules_updated_at on public.pricing_rules;
create trigger pricing_rules_updated_at before update on public.pricing_rules for each row execute function public.set_updated_at();
drop trigger if exists booking_metadata_updated_at on public.booking_metadata;
create trigger booking_metadata_updated_at before update on public.booking_metadata for each row execute function public.set_updated_at();
drop trigger if exists appointment_notes_updated_at on public.appointment_notes;
create trigger appointment_notes_updated_at before update on public.appointment_notes for each row execute function public.set_updated_at();
drop trigger if exists queue_entries_updated_at on public.queue_entries;
create trigger queue_entries_updated_at before update on public.queue_entries for each row execute function public.set_updated_at();

commit;
