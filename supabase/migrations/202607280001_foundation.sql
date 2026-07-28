-- Luxury Barber Lounge: identity, authorization, business, and location foundation.
-- Apply with Supabase CLI in timestamp order. Never place production secrets in SQL.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

DO $$ BEGIN
  create type public.app_role as enum (
    'client', 'barber', 'receptionist', 'manager', 'owner', 'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  create type public.record_status as enum (
    'draft', 'in_review', 'approved', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  phone text,
  email citext,
  website_url text,
  timezone text not null default 'America/New_York',
  default_language text not null default 'en' check (default_language in ('en','es')),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  slug text not null,
  phone text,
  email citext,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US',
  latitude numeric(10,7),
  longitude numeric(10,7),
  timezone text not null default 'America/New_York',
  parking_notes jsonb not null default '{}'::jsonb,
  accessibility_notes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  phone text,
  avatar_path text,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  status text not null default 'active' check (status in ('invited','active','suspended','deleted')),
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.app_role not null unique,
  name text not null,
  description text,
  is_staff boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (location_id is null or business_id is not null)
);

create unique index if not exists user_roles_null_scope_unique
  on public.user_roles (user_id, role_id)
  where business_id is null and location_id is null;

create unique index if not exists user_roles_business_scope_unique
  on public.user_roles (user_id, role_id, business_id)
  where business_id is not null and location_id is null;

create unique index if not exists user_roles_location_scope_unique
  on public.user_roles (user_id, role_id, business_id, location_id)
  where business_id is not null and location_id is not null;

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_id)
);

create table if not exists public.staff_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  employee_code text,
  professional_title text,
  biography jsonb not null default '{}'::jsonb,
  languages text[] not null default array['en']::text[],
  years_experience integer check (years_experience is null or years_experience >= 0),
  certifications jsonb not null default '[]'::jsonb,
  internal_notes text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, employee_code)
);

create table if not exists public.client_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  preferred_location_id uuid references public.locations(id) on delete set null,
  favorite_barber_id uuid references public.staff_profiles(user_id) on delete set null,
  birthday date,
  grooming_preferences jsonb not null default '{}'::jsonb,
  accessibility_preferences jsonb not null default '{}'::jsonb,
  square_customer_id text,
  marketing_status text not null default 'unknown' check (marketing_status in ('unknown','subscribed','unsubscribed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  transactional_email boolean not null default true,
  transactional_sms boolean not null default false,
  marketing_email boolean not null default false,
  marketing_sms boolean not null default false,
  push_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'America/New_York',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  subject_email citext,
  subject_phone text,
  consent_type text not null,
  granted boolean not null,
  source text not null,
  policy_version text,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.auth_audit (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  outcome text not null,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  closed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (location_id, weekday),
  check (closed or (opens_at is not null and closes_at is not null and closes_at > opens_at))
);

create table if not exists public.holiday_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  service_date date not null,
  opens_at time,
  closes_at time,
  closed boolean not null default false,
  note jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (location_id, service_date),
  check (closed or (opens_at is not null and closes_at is not null and closes_at > opens_at))
);

create table if not exists public.location_settings (
  location_id uuid primary key references public.locations(id) on delete cascade,
  walk_ins_enabled boolean not null default true,
  kiosk_enabled boolean not null default false,
  max_queue_size integer not null default 20 check (max_queue_size > 0),
  default_buffer_minutes integer not null default 10 check (default_buffer_minutes >= 0),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.roles (key, name, description, is_staff) values
  ('client','Client','Guest account with access only to personal records.',false),
  ('barber','Barber','Service provider with assigned operational access.',true),
  ('receptionist','Receptionist','Front-desk operational access.',true),
  ('manager','Manager','Location and operational management access.',true),
  ('owner','Owner','Business-level administrative access.',true),
  ('super_admin','Super administrator','Tightly controlled platform administration.',true)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  is_staff = excluded.is_staff;

insert into public.permissions (key, name, description) values
  ('profile.self.read','Read own profile','Read the authenticated user profile.'),
  ('profile.self.update','Update own profile','Update safe fields on the authenticated user profile.'),
  ('booking.own.read','Read own bookings','Read booking extensions linked to the current client.'),
  ('booking.manage','Manage bookings','Operate bookings for an authorized business or location.'),
  ('queue.own.read','Read own queue entry','Read private queue status linked to the current client.'),
  ('queue.manage','Manage queue','Create, assign, update, and resolve queue entries.'),
  ('client.operational.read','Read operational client data','Read only information needed to deliver a service.'),
  ('content.manage','Manage content','Create and publish approved public content.'),
  ('services.manage','Manage services','Maintain services, prices, and staff eligibility.'),
  ('commission.own.read','Read own commissions','Read commission records belonging to the barber.'),
  ('commission.dispute','Submit commission disputes','Submit evidence within an eligible review window.'),
  ('commission.manage','Manage commissions','Configure rules, settlements, and adjustments.'),
  ('users.manage','Manage users','Invite, suspend, and assign staff roles.'),
  ('settings.manage','Manage business settings','Manage business, integration, and feature settings.'),
  ('audit.read','Read audit logs','Read protected business audit history.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

-- Role permission defaults. Owners and super administrators receive all permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.key = 'client' and p.key in ('profile.self.read','profile.self.update','booking.own.read','queue.own.read')) or
  (r.key = 'barber' and p.key in ('profile.self.read','profile.self.update','client.operational.read','queue.manage','commission.own.read','commission.dispute')) or
  (r.key = 'receptionist' and p.key in ('profile.self.read','profile.self.update','client.operational.read','booking.manage','queue.manage')) or
  (r.key = 'manager' and p.key in ('profile.self.read','profile.self.update','client.operational.read','booking.manage','queue.manage','content.manage','services.manage','commission.manage','audit.read')) or
  (r.key in ('owner','super_admin'))
)
on conflict do nothing;

create or replace function public.has_role(required_role public.app_role, target_business uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = required_role
      and (
        required_role = 'super_admin'::public.app_role
        or target_business is null
        or ur.business_id = target_business
      )
  );
$$;

create or replace function public.is_business_staff(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.is_staff
      and (r.key = 'super_admin'::public.app_role or ur.business_id = target_business)
  );
$$;

create or replace function public.can_manage_business(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key in ('manager','owner','super_admin')
      and (r.key = 'super_admin'::public.app_role or ur.business_id = target_business)
  );
$$;

create or replace function public.can_operate_business(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key in ('barber','receptionist','manager','owner','super_admin')
      and (r.key = 'super_admin'::public.app_role or ur.business_id = target_business)
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_role_id uuid;
begin
  insert into public.profiles (id, full_name, display_name, phone, preferred_language)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'display_name',''),
    nullif(new.phone,''),
    case when new.raw_user_meta_data->>'preferred_language' = 'es' then 'es' else 'en' end
  )
  on conflict (id) do nothing;

  select id into client_role_id from public.roles where key = 'client' limit 1;
  if client_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, client_role_id)
    on conflict do nothing;
  end if;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create index if not exists idx_locations_business_active on public.locations (business_id, active);
create index if not exists idx_user_roles_user on public.user_roles (user_id);
create index if not exists idx_user_roles_business on public.user_roles (business_id, user_id);
create index if not exists idx_staff_profiles_business on public.staff_profiles (business_id, active);
create index if not exists idx_client_profiles_business on public.client_profiles (business_id, user_id);
create index if not exists idx_consent_subject on public.consent_records (business_id, consent_type, created_at desc);

drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
drop trigger if exists locations_updated_at on public.locations;
create trigger locations_updated_at before update on public.locations for each row execute function public.set_updated_at();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists staff_profiles_updated_at on public.staff_profiles;
create trigger staff_profiles_updated_at before update on public.staff_profiles for each row execute function public.set_updated_at();
drop trigger if exists client_profiles_updated_at on public.client_profiles;
create trigger client_profiles_updated_at before update on public.client_profiles for each row execute function public.set_updated_at();
drop trigger if exists business_hours_updated_at on public.business_hours;
create trigger business_hours_updated_at before update on public.business_hours for each row execute function public.set_updated_at();
drop trigger if exists holiday_hours_updated_at on public.holiday_hours;
create trigger holiday_hours_updated_at before update on public.holiday_hours for each row execute function public.set_updated_at();
drop trigger if exists location_settings_updated_at on public.location_settings;
create trigger location_settings_updated_at before update on public.location_settings for each row execute function public.set_updated_at();

commit;
