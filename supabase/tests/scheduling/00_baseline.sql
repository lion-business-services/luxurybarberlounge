-- Local test harness ONLY. Never run against a hosted project.
--
-- Recreates the scheduling-relevant slice of the production schema as it was
-- immediately BEFORE migration 202610020001, so that migration can be applied
-- and exercised on a disposable local Postgres (see README.md in this folder).
-- Supabase-managed pieces (auth, realtime, API roles) are stubbed.

create extension if not exists citext;
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end;
$$;

create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;

create schema if not exists realtime;
create table realtime.sent (id bigint generated always as identity primary key, payload jsonb, event text, topic text, private boolean, sent_at timestamptz default now());
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$ insert into realtime.sent (payload, event, topic, private) values (payload, event, topic, private) $$;

create type public.record_status as enum ('draft', 'review', 'published', 'archived');

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end; $$;
create or replace function public.can_operate_business(target_business uuid) returns boolean language sql stable as $$ select false $$;
create or replace function public.can_manage_business(target_business uuid) returns boolean language sql stable as $$ select false $$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/New_York',
  status text not null default 'active'
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  name text not null,
  slug text not null,
  address_line_1 text, city text, region text, postal_code text,
  timezone text not null default 'America/New_York',
  active boolean not null default true,
  unique (business_id, slug)
);

create table public.location_settings (
  location_id uuid primary key,
  walk_ins_enabled boolean not null default true,
  kiosk_enabled boolean not null default false,
  max_queue_size integer not null default 20 check (max_queue_size > 0),
  default_buffer_minutes integer not null default 10 check (default_buffer_minutes >= 0),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time, closes_at time,
  closed boolean not null default false,
  unique (location_id, weekday)
);

create table public.holiday_hours (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  service_date date not null,
  opens_at time, closes_at time,
  closed boolean not null default false,
  unique (location_id, service_date)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  category_id uuid,
  slug text not null,
  name jsonb not null,
  short_description jsonb not null default '{}'::jsonb,
  full_description jsonb not null default '{}'::jsonb,
  price_cents integer,
  duration_minutes integer,
  deposit_cents integer,
  square_catalog_id text,
  bookable boolean not null default true,
  content_status public.record_status not null default 'draft',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table public.service_addons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  service_id uuid,
  slug text not null,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price_cents integer not null default 0,
  duration_minutes integer not null default 0,
  active boolean not null default true
);

create table public.barber_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  staff_user_id uuid,
  slug text not null,
  display_name text not null,
  professional_title jsonb not null default '{}'::jsonb,
  short_intro jsonb not null default '{}'::jsonb,
  specialties jsonb not null default '[]'::jsonb,
  languages text[] not null default array['en'],
  active boolean not null default true,
  demo boolean not null default true,
  status public.record_status not null default 'draft',
  sort_order integer not null default 0,
  portal_email citext,
  unique (business_id, slug)
);

create table public.barber_profile_services (
  barber_profile_id uuid not null,
  service_id uuid not null,
  active boolean not null default true,
  primary key (barber_profile_id, service_id)
);

create table public.barber_schedules (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid,
  location_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time, ends_at time,
  active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  barber_profile_id uuid
);
create unique index barber_profile_schedules_unique on public.barber_schedules (barber_profile_id, location_id, weekday, effective_from) where barber_profile_id is not null;

create table public.barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_profile_id uuid not null,
  location_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'approved' check (status in ('requested', 'approved', 'declined', 'cancelled')),
  approved_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  availability_kind text not null default 'unavailable' check (availability_kind in ('available', 'unavailable')),
  check (ends_at > starts_at)
);

create table public.barber_breaks (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid,
  location_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'scheduled' check (status in ('requested', 'scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  barber_profile_id uuid,
  check (ends_at > starts_at)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  auth_user_id uuid,
  first_name text not null,
  last_name text not null,
  email citext,
  phone text
);

create table public.appointments (
  id uuid default gen_random_uuid() not null primary key,
  business_id uuid not null,
  location_id uuid not null,
  client_id uuid not null,
  auth_user_id uuid,
  service_id uuid not null,
  barber_profile_id uuid not null,
  assigned_staff_user_id uuid,
  public_reference text not null unique,
  manage_token_hash text not null,
  square_booking_id text,
  square_customer_id text,
  square_order_id text,
  service_name_snapshot text not null,
  service_price_snapshot_cents integer not null check (service_price_snapshot_cents >= 0),
  service_duration_snapshot_minutes integer not null check (service_duration_snapshot_minutes > 0),
  addon_snapshot jsonb default '[]'::jsonb not null,
  barber_name_snapshot text not null,
  client_name_snapshot text not null,
  client_email_snapshot citext,
  client_phone_snapshot text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  timezone text default 'America/New_York'::text not null,
  status text default 'confirmed'::text not null,
  booking_source text default 'website'::text not null,
  campaign_source text,
  campaign_medium text,
  campaign_name text,
  referral_source text,
  deposit_required_cents integer default 0 not null check (deposit_required_cents >= 0),
  deposit_status text default 'not_required'::text not null,
  client_notes text,
  internal_notes text,
  policy_version text not null,
  policy_accepted_at timestamp with time zone not null,
  email_consent boolean default true not null,
  sms_consent boolean default false not null,
  idempotency_key uuid not null unique,
  formsubmit_status text default 'queued'::text not null,
  client_confirmation_status text default 'queued'::text not null,
  barber_notification_status text default 'queued'::text not null,
  sync_status text default 'supabase_primary'::text not null,
  created_by uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_declared_status text,
  balance_token_hash text,
  constraint appointments_check check (ends_at > starts_at),
  constraint appointments_deposit_status_check check (deposit_status = any (array['not_required', 'pending', 'paid', 'refunded', 'failed'])),
  constraint appointments_status_check check (status = any (array['draft', 'slot_held', 'pending_confirmation', 'confirmed', 'checked_in', 'assigned', 'in_service', 'completed', 'rescheduled', 'cancelled_by_client', 'cancelled_by_business', 'no_show', 'declined', 'expired', 'failed'])),
  constraint appointments_no_active_overlap exclude using gist (barber_profile_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status = any (array['slot_held', 'pending_confirmation', 'confirmed', 'checked_in', 'assigned', 'in_service']))
);
create index idx_appointments_barber on public.appointments (barber_profile_id, starts_at);

create table public.slot_holds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  location_id uuid not null,
  barber_profile_id uuid not null,
  service_id uuid not null,
  idempotency_key uuid not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'consumed', 'expired', 'released')),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.appointment_status_history (
  id bigint generated by default as identity primary key,
  booking_metadata_id uuid,
  from_status text,
  to_status text not null,
  changed_by uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  appointment_id uuid,
  check (booking_metadata_id is not null or appointment_id is not null)
);

create table public.appointment_assignments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  barber_profile_id uuid not null,
  assigned_staff_user_id uuid,
  assignment_source text not null check (assignment_source in ('booking', 'first_available', 'admin', 'reception', 'system')),
  reason text,
  assigned_by uuid,
  active boolean not null default true,
  assigned_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz
);

create table public.audit_logs (
  id bigint generated by default as identity primary key,
  business_id uuid,
  actor_user_id uuid,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.appointment_payment_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  appointment_id uuid not null,
  purpose text not null default 'deposit' check (purpose in ('deposit', 'balance')),
  amount_cents integer not null check (amount_cents > 0),
  square_payment_link_id text not null,
  square_order_id text not null,
  checkout_url text not null,
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.square_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  square_id text not null,
  square_order_id text,
  status text,
  amount_cents integer not null default 0,
  raw jsonb not null default '{}'::jsonb
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  user_id uuid,
  channel text not null,
  template_key text,
  locale text not null default 'en',
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  scheduled_for timestamptz not null default timezone('utc', now()),
  status text not null default 'queued',
  unique (channel, idempotency_key)
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  appointment_id uuid,
  status text not null default 'waiting',
  estimated_wait_minutes integer,
  service_started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.queue_assignments (
  id uuid primary key default gen_random_uuid(),
  queue_entry_id uuid not null,
  active boolean not null default true,
  released_at timestamptz
);

-- Pre-migration functions, copied from production -------------------------------------------------

create or replace function public.appointment_transition_allowed(current_status text, next_status text)
returns boolean language sql immutable as $$
select case current_status when 'draft' then next_status in ('slot_held','pending_confirmation','confirmed','failed','expired') when 'slot_held' then next_status in ('pending_confirmation','confirmed','expired','failed') when 'pending_confirmation' then next_status in ('confirmed','declined','expired','failed') when 'confirmed' then next_status in ('checked_in','rescheduled','cancelled_by_client','cancelled_by_business','no_show') when 'checked_in' then next_status in ('assigned','in_service','cancelled_by_business','no_show') when 'assigned' then next_status in ('in_service','cancelled_by_business','no_show') when 'in_service' then next_status in ('completed','cancelled_by_business') when 'rescheduled' then next_status in ('confirmed','cancelled_by_client','cancelled_by_business','no_show') else false end;
$$;

create or replace function public.validate_appointment_status_transition() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if old.status is distinct from new.status and not public.appointment_transition_allowed(old.status, new.status) then
    raise exception 'INVALID_APPOINTMENT_STATUS_TRANSITION' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- Placeholders with the production signatures; the migration replaces their bodies.
create or replace function public.enforce_appointment_barber_availability() returns trigger language plpgsql as $$ begin return new; end; $$;
create or replace function public.enforce_approved_barber_time_off_on_appointment() returns trigger language plpgsql as $$ begin return new; end; $$;
create or replace function public.create_appointment_atomic(p_data jsonb) returns public.appointments language plpgsql as $$ begin return null; end; $$;
create or replace function public.reschedule_appointment_atomic(p_appointment_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_actor uuid, p_actor_role text, p_reason text) returns public.appointments language plpgsql as $$ begin return null; end; $$;
create or replace function public.get_public_booking_catalog() returns jsonb language sql stable as $$ select '{}'::jsonb $$;

create or replace function public.enforce_website_full_prepayment() returns trigger language plpgsql set search_path to 'public' as $$
declare
  paid_principal_cents integer := 0;
  must_validate boolean := false;
begin
  if new.booking_source = 'website' and coalesce(new.service_price_snapshot_cents, 0) > 0 then
    new.deposit_required_cents := new.service_price_snapshot_cents;
    if tg_op = 'INSERT' then
      must_validate := new.status = 'confirmed' or new.deposit_status = 'paid';
    else
      must_validate :=
        (new.status = 'confirmed' and old.status is distinct from 'confirmed')
        or (new.deposit_status = 'paid' and old.deposit_status is distinct from 'paid');
    end if;
    if must_validate then
      select coalesce(sum(l.amount_cents), 0)::integer into paid_principal_cents
      from public.appointment_payment_links l
      where l.appointment_id = new.id and l.status = 'paid' and l.purpose in ('deposit', 'balance');
      if paid_principal_cents < new.service_price_snapshot_cents then
        if new.status = 'confirmed' then new.status := 'pending_confirmation'; end if;
        if new.deposit_status = 'paid' then new.deposit_status := 'pending'; end if;
      elsif new.status = 'confirmed' then
        new.deposit_status := 'paid';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.sync_appointment_status_to_queue() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare q_status text;
begin
  if new.status is not distinct from old.status then return new; end if;
  q_status := case new.status
    when 'checked_in' then 'checked_in' when 'assigned' then 'assigned' when 'in_service' then 'in_service'
    when 'completed' then 'completed' when 'no_show' then 'no_show'
    when 'cancelled_by_client' then 'removed' when 'cancelled_by_business' then 'removed' else null end;
  if q_status is null then return new; end if;
  update queue_entries
     set status = q_status,
         estimated_wait_minutes = case when q_status in ('in_service','completed','no_show','removed') then 0 else estimated_wait_minutes end,
         service_started_at = case when q_status = 'in_service' then coalesce(service_started_at, now()) else service_started_at end,
         completed_at = case when q_status = 'completed' then coalesce(completed_at, now()) else completed_at end
   where appointment_id = new.id and status not in ('completed','cancelled','removed','no_show');
  if q_status in ('completed','no_show','removed') then
    update queue_assignments qa set active = false, released_at = coalesce(released_at, now())
    where qa.active = true and exists (select 1 from queue_entries qe where qe.id = qa.queue_entry_id and qe.appointment_id = new.id);
  end if;
  return new;
end $$;

create or replace function public.queue_barber_booking_email_on_appointment() returns trigger language plpgsql security definer set search_path to 'public', 'auth' as $$
declare barber_email text;
begin
  if coalesce(new.booking_source, 'website') <> 'website' then return new; end if;
  select coalesce(nullif(btrim(u.email::text), ''), nullif(btrim(bp.portal_email::text), '')) into barber_email
  from public.barber_profiles bp left join auth.users u on u.id = new.assigned_staff_user_id
  where bp.id = new.barber_profile_id;
  if barber_email is null then return new; end if;
  insert into public.notification_jobs (business_id, user_id, channel, template_key, locale, recipient, payload, idempotency_key, scheduled_for, status)
  values (new.business_id, new.assigned_staff_user_id, 'email', 'barber_booking_assigned', 'en', barber_email,
          jsonb_build_object('subject', 'New appointment: ' || new.service_name_snapshot, 'appointmentId', new.id),
          'barber-booking-assigned:' || new.id::text, timezone('utc', now()), 'queued')
  on conflict (channel, idempotency_key) do nothing;
  return new;
end;
$$;

create or replace function public.broadcast_queue_display_change() returns trigger language plpgsql security definer set search_path to 'public', 'realtime' as $$
begin
  perform realtime.send(jsonb_build_object('changedAt', timezone('utc', now()), 'source', tg_table_name, 'operation', tg_op), 'queue_changed', 'queue-display:northfield', false);
  return null;
end;
$$;

create or replace function public.enforce_verified_square_appointment_payment_link() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_booking_source text;
  v_verified_amount bigint := 0;
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select a.booking_source into v_booking_source from public.appointments a where a.id = new.appointment_id;
    if v_booking_source in ('website', 'qr_business_card') then
      select coalesce(sum(sp.amount_cents), 0) into v_verified_amount
      from public.square_payments sp
      where sp.business_id = new.business_id and sp.square_order_id = new.square_order_id
        and upper(coalesce(sp.status, '')) = 'COMPLETED' and upper(coalesce(sp.raw->>'source_type', '')) <> 'CASH';
      if v_verified_amount < coalesce(new.amount_cents, 0) then
        raise exception 'SQUARE_PAYMENT_NOT_VERIFIED' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger appointments_realtime_display after insert or delete or update of status, starts_at, barber_profile_id, assigned_staff_user_id, barber_name_snapshot, client_name_snapshot, service_name_snapshot on public.appointments for each row execute function public.broadcast_queue_display_change();
create trigger appointments_sync_queue_status after update of status on public.appointments for each row execute function public.sync_appointment_status_to_queue();
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger appointments_validate_status before update of status on public.appointments for each row execute function public.validate_appointment_status_transition();
create trigger trg_enforce_appointment_barber_availability before insert or update of barber_profile_id, location_id, starts_at, ends_at, status on public.appointments for each row execute function public.enforce_appointment_barber_availability();
create trigger trg_enforce_approved_barber_time_off_on_appointment before insert or update of barber_profile_id, starts_at, ends_at, status on public.appointments for each row execute function public.enforce_approved_barber_time_off_on_appointment();
create trigger trg_enforce_website_full_prepayment before insert or update of booking_source, service_price_snapshot_cents, deposit_required_cents, deposit_status, status on public.appointments for each row execute function public.enforce_website_full_prepayment();
create trigger trg_queue_barber_booking_email_on_appointment after insert on public.appointments for each row execute function public.queue_barber_booking_email_on_appointment();
create trigger appointment_payment_links_require_verified_square before insert or update of status on public.appointment_payment_links for each row execute function public.enforce_verified_square_appointment_payment_link();
create trigger location_settings_updated_at before update on public.location_settings for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
