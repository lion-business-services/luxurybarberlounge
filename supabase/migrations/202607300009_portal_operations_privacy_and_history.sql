-- Luxury Barber Lounge: complete authenticated client history, owner CRM extensions,
-- privacy workflows, membership requests, order support, and portal-specific RLS.
begin;

create table if not exists public.sessions_metadata (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_hash text not null unique,
  device_label text,
  ip_hash text,
  user_agent_hash text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'business' check (sensitivity in ('public','business','restricted','secret_reference')),
  version integer not null default 1 check (version > 0),
  effective_from timestamptz not null default timezone('utc', now()),
  effective_to timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, key, version),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.client_preferences (
  user_id uuid primary key references public.client_profiles(user_id) on delete cascade,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  preferred_barber_id uuid references public.staff_profiles(user_id) on delete set null,
  favorite_service_ids uuid[] not null default '{}'::uuid[],
  haircut_preference text,
  fade_preference text,
  beard_preference text,
  guard_preference text,
  product_preference text,
  sensitivities text,
  communication_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_tags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  tag text not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, client_user_id, tag)
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  note text not null check (char_length(note) between 1 and 5000),
  visibility text not null default 'internal' check (visibility in ('internal','client')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_history_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  event_type text not null,
  source text not null,
  source_id text,
  summary jsonb not null default '{}'::jsonb,
  client_visible boolean not null default true,
  immutable boolean not null default true,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_square_mappings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  square_customer_id text not null,
  match_method text not null check (match_method in ('verified_email','verified_phone','owner_approved','imported')),
  confidence text not null default 'verified' check (confidence in ('verified','owner_approved','review_required')),
  matched_by uuid references public.profiles(id) on delete set null,
  matched_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (business_id, client_user_id),
  unique (business_id, square_customer_id)
);

create table if not exists public.client_merge_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  canonical_client_user_id uuid not null references public.client_profiles(user_id) on delete restrict,
  duplicate_client_user_id uuid not null references public.client_profiles(user_id) on delete restrict,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed','cancelled')),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  check (canonical_client_user_id <> duplicate_client_user_id)
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export','deletion','correction','consent_change')),
  status text not null default 'submitted' check (status in ('submitted','identity_verified','in_review','completed','rejected','cancelled')),
  details jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  completed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.barber_locations (
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary_location boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (barber_user_id, location_id)
);

create table if not exists public.barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'requested' check (status in ('requested','approved','rejected','cancelled')),
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  check (ends_at > starts_at)
);

create table if not exists public.appointment_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_metadata_id uuid not null references public.booking_metadata(id) on delete cascade,
  assigned_barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  preferred_barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  assignment_source text not null check (assignment_source in ('booking','automatic','reception','manager','owner')),
  assignment_reason text not null,
  rule_version_id uuid references public.assignment_rule_versions(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_extensions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_order_id uuid not null references public.square_orders(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  commission_treatment text,
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending','matched','exception','resolved')),
  client_visible_metadata jsonb not null default '{}'::jsonb,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (square_order_id)
);

create table if not exists public.order_support_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  square_order_id uuid references public.square_orders(id) on delete set null,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_review','waiting_client','resolved','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.receipts_metadata (
  id uuid primary key default gen_random_uuid(),
  square_order_id uuid not null references public.square_orders(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  receipt_number text,
  receipt_url text,
  issued_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (square_order_id)
);

create table if not exists public.membership_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.membership_plans(id) on delete cascade,
  version integer not null check (version > 0),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price_cents integer check (price_cents is null or price_cents >= 0),
  billing_interval text,
  benefits jsonb not null default '[]'::jsonb,
  usage_rules jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','active','retired')),
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, version),
  check (effective_to is null or effective_from is null or effective_to > effective_from)
);

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid not null references public.client_profiles(user_id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  request_type text not null check (request_type in ('activate','upgrade','downgrade','pause','resume','cancel')),
  requested_plan_id uuid references public.membership_plans(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted','in_review','provider_pending','completed','rejected','cancelled')),
  reason text,
  provider_reference text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_audiences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete cascade,
  recipient_email citext,
  recipient_phone text,
  consent_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'eligible' check (status in ('eligible','suppressed','queued','sent','failed')),
  created_at timestamptz not null default timezone('utc', now()),
  check (client_user_id is not null or recipient_email is not null or recipient_phone is not null)
);

-- Portal query indexes.
create index if not exists idx_sessions_metadata_user_seen on public.sessions_metadata (user_id, last_seen_at desc);
create index if not exists idx_client_notes_client_created on public.client_notes (client_user_id, created_at desc);
create index if not exists idx_client_history_client_occurred on public.client_history_events (client_user_id, occurred_at desc);
create index if not exists idx_privacy_requests_user_status on public.privacy_requests (user_id, status, created_at desc);
create index if not exists idx_barber_time_off_lookup on public.barber_time_off (barber_user_id, starts_at, ends_at, status);
create index if not exists idx_appointment_assignments_booking_active on public.appointment_assignments (booking_metadata_id, active, created_at desc);
create index if not exists idx_order_extensions_client on public.order_extensions (client_user_id, created_at desc);
create index if not exists idx_order_support_client_status on public.order_support_cases (client_user_id, status, created_at desc);
create index if not exists idx_membership_requests_client_status on public.membership_requests (client_user_id, status, created_at desc);
create index if not exists idx_campaign_audiences_campaign_status on public.campaign_audiences (campaign_id, status);

-- Updated-at triggers use the shared helper created in the foundation migration.
drop trigger if exists business_settings_updated_at on public.business_settings;
create trigger business_settings_updated_at before update on public.business_settings for each row execute function public.set_updated_at();
drop trigger if exists client_notes_updated_at on public.client_notes;
create trigger client_notes_updated_at before update on public.client_notes for each row execute function public.set_updated_at();
drop trigger if exists privacy_requests_updated_at on public.privacy_requests;
create trigger privacy_requests_updated_at before update on public.privacy_requests for each row execute function public.set_updated_at();
drop trigger if exists order_extensions_updated_at on public.order_extensions;
create trigger order_extensions_updated_at before update on public.order_extensions for each row execute function public.set_updated_at();
drop trigger if exists order_support_cases_updated_at on public.order_support_cases;
create trigger order_support_cases_updated_at before update on public.order_support_cases for each row execute function public.set_updated_at();
drop trigger if exists membership_requests_updated_at on public.membership_requests;
create trigger membership_requests_updated_at before update on public.membership_requests for each row execute function public.set_updated_at();

alter table public.sessions_metadata enable row level security;
alter table public.business_settings enable row level security;
alter table public.client_preferences enable row level security;
alter table public.client_tags enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_history_events enable row level security;
alter table public.client_square_mappings enable row level security;
alter table public.client_merge_requests enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.barber_locations enable row level security;
alter table public.barber_time_off enable row level security;
alter table public.appointment_assignments enable row level security;
alter table public.order_extensions enable row level security;
alter table public.order_support_cases enable row level security;
alter table public.receipts_metadata enable row level security;
alter table public.membership_plan_versions enable row level security;
alter table public.membership_requests enable row level security;
alter table public.campaign_audiences enable row level security;

-- Clients see and update only their own self-service records.
create policy sessions_metadata_self_read on public.sessions_metadata for select using (user_id = auth.uid());
create policy client_preferences_self_all on public.client_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy client_notes_self_read on public.client_notes for select using (client_user_id = auth.uid() and visibility = 'client');
create policy client_history_self_read on public.client_history_events for select using (client_user_id = auth.uid() and client_visible);
create policy client_square_mappings_self_read on public.client_square_mappings for select using (client_user_id = auth.uid());
create policy privacy_requests_self_read on public.privacy_requests for select using (user_id = auth.uid());
create policy privacy_requests_self_insert on public.privacy_requests for insert with check (user_id = auth.uid());
create policy appointment_assignments_client_read on public.appointment_assignments for select using (
  exists (select 1 from public.booking_metadata b where b.id = booking_metadata_id and b.client_user_id = auth.uid())
);
create policy order_extensions_client_read on public.order_extensions for select using (client_user_id = auth.uid());
create policy order_support_cases_self_read on public.order_support_cases for select using (client_user_id = auth.uid());
create policy order_support_cases_self_insert on public.order_support_cases for insert with check (client_user_id = auth.uid());
create policy receipts_metadata_client_read on public.receipts_metadata for select using (client_user_id = auth.uid());
create policy memberships_versions_public_read on public.membership_plan_versions for select using (status = 'active');
create policy membership_requests_self_read on public.membership_requests for select using (client_user_id = auth.uid());
create policy membership_requests_self_insert on public.membership_requests for insert with check (client_user_id = auth.uid());

-- Operational and owner CRM access remains business scoped.
create policy business_settings_owner_access on public.business_settings for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
create policy client_tags_staff_access on public.client_tags for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
create policy client_notes_staff_access on public.client_notes for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
create policy client_history_staff_read on public.client_history_events for select using (public.can_operate_business(business_id));
create policy client_history_admin_insert on public.client_history_events for insert with check (public.can_operate_business(business_id));
create policy client_square_mappings_admin_access on public.client_square_mappings for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy client_merge_requests_admin_access on public.client_merge_requests for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy privacy_requests_admin_access on public.privacy_requests for all using (business_id is not null and public.can_admin_business(business_id)) with check (business_id is not null and public.can_admin_business(business_id));
create policy barber_locations_self_read on public.barber_locations for select using (
  barber_user_id = auth.uid() or exists (
    select 1 from public.locations l where l.id = location_id and public.can_operate_business(l.business_id)
  )
);
create policy barber_locations_admin_access on public.barber_locations for all using (
  exists (select 1 from public.locations l where l.id = location_id and public.can_manage_business(l.business_id))
) with check (
  exists (select 1 from public.locations l where l.id = location_id and public.can_manage_business(l.business_id))
);
create policy barber_time_off_self_read on public.barber_time_off for select using (
  barber_user_id = auth.uid() or exists (
    select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_operate_business(s.business_id)
  )
);
create policy barber_time_off_self_insert on public.barber_time_off for insert with check (barber_user_id = auth.uid());
create policy barber_time_off_admin_update on public.barber_time_off for update using (
  exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id))
) with check (
  exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id))
);
create policy appointment_assignments_staff_access on public.appointment_assignments for all using (
  exists (select 1 from public.booking_metadata b where b.id = booking_metadata_id and public.can_operate_business(b.business_id))
) with check (
  exists (select 1 from public.booking_metadata b where b.id = booking_metadata_id and public.can_operate_business(b.business_id))
);
create policy order_extensions_staff_access on public.order_extensions for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
create policy order_support_cases_staff_access on public.order_support_cases for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
create policy receipts_metadata_staff_read on public.receipts_metadata for select using (
  exists (select 1 from public.square_orders o where o.id = square_order_id and public.can_operate_business(o.business_id))
);
create policy membership_plan_versions_admin_access on public.membership_plan_versions for all using (
  exists (select 1 from public.membership_plans p where p.id = plan_id and public.can_manage_business(p.business_id))
) with check (
  exists (select 1 from public.membership_plans p where p.id = plan_id and public.can_manage_business(p.business_id))
);
create policy membership_requests_admin_access on public.membership_requests for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy campaign_audiences_admin_access on public.campaign_audiences for all using (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.can_manage_business(c.business_id))
) with check (
  exists (select 1 from public.campaigns c where c.id = campaign_id and public.can_manage_business(c.business_id))
);

-- Staff need the profile identity rows required by CRM joins, while clients remain self-scoped.
create policy profiles_operational_staff_read on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.client_profiles cp
    where cp.user_id = profiles.id and cp.business_id is not null and public.can_operate_business(cp.business_id)
  ) or exists (
    select 1 from public.staff_profiles sp
    where sp.user_id = profiles.id and public.can_operate_business(sp.business_id)
  )
);
create policy client_preferences_staff_access on public.client_preferences for all using (
  exists (select 1 from public.client_profiles cp where cp.user_id = client_preferences.user_id and cp.business_id is not null and public.can_operate_business(cp.business_id))
) with check (
  exists (select 1 from public.client_profiles cp where cp.user_id = client_preferences.user_id and cp.business_id is not null and public.can_operate_business(cp.business_id))
);

-- Client write policies are intentionally absent for staff-only tags and immutable history.

commit;
