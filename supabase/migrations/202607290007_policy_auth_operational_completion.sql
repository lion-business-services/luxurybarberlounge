-- Luxury Barber Lounge: passwordless access support, workforce operations,
-- policy governance, attribution evidence, queue auditability, and immutable ledgers.
begin;

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  email citext not null,
  intended_role public.app_role not null,
  location_id uuid references public.locations(id) on delete set null,
  invited_by uuid references public.profiles(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.barber_images (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid references public.staff_profiles(user_id) on delete cascade,
  barber_profile_id uuid references public.barber_profiles(id) on delete cascade,
  image_type text not null check (image_type in ('original','homepage','directory','profile','booking','mobile','tablet','desktop')),
  storage_path text not null,
  width integer,
  height integer,
  object_position jsonb not null default '{}'::jsonb,
  alt_text jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (barber_profile_id, image_type, storage_path)
);

create table if not exists public.barber_schedules (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time,
  ends_at time,
  active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (not active or (starts_at is not null and ends_at is not null and ends_at > starts_at)),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.barber_breaks (
  id uuid primary key default gen_random_uuid(),
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'scheduled' check (status in ('requested','scheduled','cancelled','completed')),
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create table if not exists public.assignment_rule_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  version integer not null check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  status text not null default 'draft' check (status in ('draft','approved','active','retired')),
  rules jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, version),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.assignment_overrides (
  id uuid primary key default gen_random_uuid(),
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  previous_barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  next_barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  reason text not null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  rule_version_id uuid references public.assignment_rule_versions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.queue_assignments add column if not exists rule_version_id uuid references public.assignment_rule_versions(id) on delete set null;
alter table public.queue_assignments add column if not exists assignment_source text not null default 'manual' check (assignment_source in ('automatic','reception','manager','owner'));
alter table public.queue_assignments add column if not exists explanation jsonb not null default '{}'::jsonb;
alter table public.queue_entries drop constraint if exists queue_entries_status_check;
alter table public.queue_entries add constraint queue_entries_status_check check (status in ('waiting','confirmed','checked_in','assigned','called','ready','in_service','completed','cancelled','removed','no_show'));

create table if not exists public.imported_client_rosters (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  policy_version text not null,
  submitted_at timestamptz,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','accepted','partially_accepted','rejected','withdrawn')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.imported_client_roster_entries (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.imported_client_rosters(id) on delete cascade,
  client_name text not null,
  client_email citext,
  client_phone text,
  prior_service_date date,
  prior_place text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','needs_information')),
  decision_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attribution_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  client_email citext,
  client_phone text,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  roster_entry_id uuid references public.imported_client_roster_entries(id) on delete set null,
  claim_type text not null check (claim_type in ('pre_existing','personal_referral','referral_code','approved_lead','roster','late_claim')),
  requested_at timestamptz not null default timezone('utc', now()),
  status text not null default 'submitted' check (status in ('draft','submitted','needs_information','under_review','approved','rejected','withdrawn','locked')),
  explanation text not null,
  criteria jsonb not null default '{}'::jsonb,
  policy_version text not null,
  submitted_before_service boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attribution_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.attribution_claims(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('appointment_record','pos_record','booking_export','client_list','message_history','client_confirmation','other')),
  storage_path text,
  evidence_date date,
  description text,
  submitted_by uuid references public.profiles(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted','verified','rejected','superseded')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attribution_decisions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.attribution_claims(id) on delete restrict,
  decision text not null check (decision in ('approved','rejected','needs_information')),
  reason text not null,
  decided_by uuid not null references public.profiles(id) on delete restrict,
  effective_from timestamptz,
  rule_version_id uuid references public.attribution_rule_versions(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_barber_attributions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  client_external_ref text,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  attribution text not null default 'SHOP' check (attribution in ('SHOP','BARBER')),
  source text not null,
  claim_id uuid references public.attribution_claims(id) on delete set null,
  evidence_summary jsonb not null default '{}'::jsonb,
  rule_version_id uuid references public.attribution_rule_versions(id) on delete restrict,
  effective_from timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (client_user_id is not null or client_external_ref is not null)
);

create unique index if not exists client_barber_attribution_user_unique on public.client_barber_attributions (business_id, client_user_id, barber_user_id) where client_user_id is not null;
create unique index if not exists client_barber_attribution_external_unique on public.client_barber_attributions (business_id, client_external_ref, barber_user_id) where client_external_ref is not null;

create table if not exists public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  policy_key text not null,
  version text not null,
  title text not null,
  effective_from timestamptz,
  effective_to timestamptz,
  status text not null default 'draft' check (status in ('draft','owner_review','approved','published','retired')),
  source_document text,
  policy_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, policy_key, version),
  check (effective_to is null or effective_from is null or effective_to > effective_from)
);

create table if not exists public.policy_approvals (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.policy_versions(id) on delete cascade,
  rule_key text not null,
  rule_label text not null,
  rule_state text not null check (rule_state in ('locked','proposed','open')),
  owner_decision text check (owner_decision is null or owner_decision in ('approved','rejected','edited','deferred')),
  approved_value jsonb,
  owner_initials text,
  effective_from timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (policy_version_id, rule_key)
);

create table if not exists public.policy_open_items (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.policy_versions(id) on delete cascade,
  item_number integer not null,
  question text not null,
  answer jsonb,
  status text not null default 'open' check (status in ('open','answered','approved','rejected','legal_review')),
  owner_note text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (policy_version_id, item_number)
);

create table if not exists public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.policy_versions(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  acknowledged_at timestamptz not null default timezone('utc', now()),
  acknowledgement_text text not null,
  signature_name text,
  ip_hash text,
  user_agent_hash text,
  unique (policy_version_id, user_id)
);

create table if not exists public.statement_deliveries (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.settlement_statements(id) on delete cascade,
  channel text not null check (channel in ('email','portal','sms')),
  recipient text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed','opened','acknowledged')),
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price_cents integer not null check (price_cents >= 0),
  visits integer not null check (visits > 0),
  per_visit_value_cents integer check (per_visit_value_cents is null or per_visit_value_cents >= 0),
  status text not null default 'draft' check (status in ('draft','approved','active','paused','archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.package_redemptions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete restrict,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  value_cents integer not null check (value_cents >= 0),
  redeemed_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.prevent_locked_calculation_change()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if old.status in ('locked','paid') or old.locked_at is not null then
    raise exception 'Locked commission calculations are immutable; create an adjustment instead.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists commission_calculations_immutable on public.commission_calculations;
create trigger commission_calculations_immutable before update or delete on public.commission_calculations for each row execute function public.prevent_locked_calculation_change();

create or replace function public.prevent_final_statement_change()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if old.status in ('final','paid') then
    raise exception 'Final settlement statements are immutable; create an adjustment instead.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists settlement_statements_immutable on public.settlement_statements;
create trigger settlement_statements_immutable before update or delete on public.settlement_statements for each row execute function public.prevent_final_statement_change();

create index if not exists idx_user_invitations_email_status on public.user_invitations (email, status, expires_at);
create index if not exists idx_barber_schedules_lookup on public.barber_schedules (barber_user_id, location_id, weekday, active);
create index if not exists idx_barber_breaks_lookup on public.barber_breaks (barber_user_id, starts_at, ends_at, status);
create index if not exists idx_rosters_barber_status on public.imported_client_rosters (barber_user_id, status, created_at desc);
create index if not exists idx_claims_barber_status on public.attribution_claims (barber_user_id, status, requested_at desc);
create index if not exists idx_claims_client on public.attribution_claims (client_user_id, client_email, client_phone);
create index if not exists idx_attributions_pair on public.client_barber_attributions (business_id, barber_user_id, attribution);
create index if not exists idx_policy_versions_status on public.policy_versions (business_id, policy_key, status, created_at desc);
create index if not exists idx_statement_deliveries_status on public.statement_deliveries (status, created_at);

alter table public.user_invitations enable row level security;
alter table public.barber_images enable row level security;
alter table public.barber_schedules enable row level security;
alter table public.barber_breaks enable row level security;
alter table public.assignment_rule_versions enable row level security;
alter table public.assignment_overrides enable row level security;
alter table public.imported_client_rosters enable row level security;
alter table public.imported_client_roster_entries enable row level security;
alter table public.attribution_claims enable row level security;
alter table public.attribution_evidence enable row level security;
alter table public.attribution_decisions enable row level security;
alter table public.client_barber_attributions enable row level security;
alter table public.policy_versions enable row level security;
alter table public.policy_approvals enable row level security;
alter table public.policy_open_items enable row level security;
alter table public.policy_acknowledgements enable row level security;
alter table public.statement_deliveries enable row level security;
alter table public.packages enable row level security;
alter table public.package_redemptions enable row level security;

create policy user_invitations_admin on public.user_invitations for all using (business_id is not null and public.can_admin_business(business_id)) with check (business_id is not null and public.can_admin_business(business_id));
create policy barber_images_public_read on public.barber_images for select using (active and barber_profile_id is not null);
create policy barber_images_manage on public.barber_images for all using (barber_user_id = auth.uid() or exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id))) with check (barber_user_id = auth.uid() or exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id)));
create policy barber_schedules_self_read on public.barber_schedules for select using (barber_user_id = auth.uid() or exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_operate_business(s.business_id)));
create policy barber_schedules_manage on public.barber_schedules for all using (exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id))) with check (exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id)));
create policy barber_breaks_self_read on public.barber_breaks for select using (barber_user_id = auth.uid() or exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_operate_business(s.business_id)));
create policy barber_breaks_manage on public.barber_breaks for all using (exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id))) with check (exists (select 1 from public.staff_profiles s where s.user_id = barber_user_id and public.can_manage_business(s.business_id)));
create policy assignment_rules_admin on public.assignment_rule_versions for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
create policy assignment_overrides_staff on public.assignment_overrides for select using (exists (select 1 from public.queue_entries q where q.id = queue_entry_id and public.can_operate_business(q.business_id)));
create policy assignment_overrides_manage on public.assignment_overrides for insert with check (exists (select 1 from public.queue_entries q where q.id = queue_entry_id and public.can_operate_business(q.business_id)) and actor_user_id = auth.uid());
create policy rosters_barber_read on public.imported_client_rosters for select using (barber_user_id = auth.uid() or public.can_manage_business(business_id));
create policy rosters_barber_insert on public.imported_client_rosters for insert with check (barber_user_id = auth.uid());
create policy rosters_admin_update on public.imported_client_rosters for update using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy roster_entries_access on public.imported_client_roster_entries for select using (exists (select 1 from public.imported_client_rosters r where r.id = roster_id and (r.barber_user_id = auth.uid() or public.can_manage_business(r.business_id))));
create policy roster_entries_barber_insert on public.imported_client_roster_entries for insert with check (exists (select 1 from public.imported_client_rosters r where r.id = roster_id and r.barber_user_id = auth.uid() and r.status = 'draft'));
create policy claims_barber_read on public.attribution_claims for select using (barber_user_id = auth.uid() or public.can_manage_business(business_id));
create policy claims_barber_insert on public.attribution_claims for insert with check (barber_user_id = auth.uid());
create policy claims_admin_update on public.attribution_claims for update using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy evidence_access on public.attribution_evidence for select using (exists (select 1 from public.attribution_claims c where c.id = claim_id and (c.barber_user_id = auth.uid() or public.can_manage_business(c.business_id))));
create policy evidence_barber_insert on public.attribution_evidence for insert with check (submitted_by = auth.uid() and exists (select 1 from public.attribution_claims c where c.id = claim_id and c.barber_user_id = auth.uid()));
create policy decisions_access on public.attribution_decisions for select using (exists (select 1 from public.attribution_claims c where c.id = claim_id and (c.barber_user_id = auth.uid() or public.can_manage_business(c.business_id))));
create policy decisions_admin_insert on public.attribution_decisions for insert with check (exists (select 1 from public.attribution_claims c where c.id = claim_id and public.can_manage_business(c.business_id)) and decided_by = auth.uid());
create policy attributions_barber_read on public.client_barber_attributions for select using (barber_user_id = auth.uid() or public.can_manage_business(business_id));
create policy attributions_admin_write on public.client_barber_attributions for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
create policy policies_staff_read on public.policy_versions for select using (status = 'published' or public.can_admin_business(business_id));
create policy policies_admin_write on public.policy_versions for all using (public.can_admin_business(business_id)) with check (public.can_admin_business(business_id));
create policy policy_approvals_admin on public.policy_approvals for all using (exists (select 1 from public.policy_versions p where p.id = policy_version_id and public.can_admin_business(p.business_id))) with check (exists (select 1 from public.policy_versions p where p.id = policy_version_id and public.can_admin_business(p.business_id)));
create policy policy_open_items_admin on public.policy_open_items for all using (exists (select 1 from public.policy_versions p where p.id = policy_version_id and public.can_admin_business(p.business_id))) with check (exists (select 1 from public.policy_versions p where p.id = policy_version_id and public.can_admin_business(p.business_id)));
create policy acknowledgements_self_read on public.policy_acknowledgements for select using (user_id = auth.uid() or exists (select 1 from public.policy_versions p where p.id = policy_version_id and public.can_admin_business(p.business_id)));
create policy acknowledgements_self_insert on public.policy_acknowledgements for insert with check (user_id = auth.uid());
create policy statement_deliveries_barber_read on public.statement_deliveries for select using (exists (select 1 from public.settlement_statements s where s.id = statement_id and (s.barber_user_id = auth.uid() or public.can_admin_business(s.business_id))));
create policy packages_public_read on public.packages for select using (status = 'active');
create policy packages_admin_write on public.packages for all using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy package_redemptions_client_read on public.package_redemptions for select using (client_user_id = auth.uid() or exists (select 1 from public.packages p where p.id = package_id and public.can_operate_business(p.business_id)));

-- Locked defaults from Commission Policy v1.0. Proposed and open rules are seeded disabled.
with b as (select id from public.businesses where slug='luxury-barber-lounge' limit 1),
policy as (
  insert into public.policy_versions (business_id, policy_key, version, title, effective_from, status, source_document, policy_snapshot)
  select id, 'attribution_commission', '1.0', 'Attribution and Commission Policy', '2026-01-06T05:00:00Z', 'owner_review', 'LBL-Commission-Policy-v1.0.docx', jsonb_build_object('timezone','America/New_York','settlement_week','monday-sunday') from b
  on conflict (business_id, policy_key, version) do update set source_document=excluded.source_document
  returning id
)
insert into public.policy_approvals (policy_version_id, rule_key, rule_label, rule_state, owner_decision, approved_value, effective_from)
select policy.id, x.rule_key, x.label, 'locked', 'approved', x.value, '2026-01-06T05:00:00Z'
from policy cross join (values
  ('shop_client_split','Shop-generated client: 70% independent barber / 30% Shop','{"barber_rate":0.70,"shop_rate":0.30}'::jsonb),
  ('barber_client_split','Verified pre-existing client: 100% independent barber','{"barber_rate":1.0,"shop_rate":0.0}'::jsonb),
  ('tips','Tips: 100% independent barber, outside Commission Basis','{"barber_rate":1.0,"included_in_basis":false}'::jsonb),
  ('default_attribution','Default attribution is SHOP','{"default":"SHOP","burden":"BARBER"}'::jsonb),
  ('walkins','Walk-ins are SHOP','{"attribution":"SHOP"}'::jsonb),
  ('attribution_dispute_window','Attribution dispute window is 24 hours','{"hours":24}'::jsonb),
  ('integrity_volume_flag','Flag more than 40% of new clients claimed as pre-existing','{"threshold":0.40}'::jsonb),
  ('settlement_week','Settlement week is Monday through Sunday Eastern Time','{"timezone":"America/New_York","start":"MONDAY","end":"SUNDAY"}'::jsonb),
  ('statement_issue_day','Statement issued Monday','{"day":"MONDAY"}'::jsonb),
  ('payout_method','Manual owner settlement by Zelle or cash','{"methods":["zelle","cash"],"automatic":false}'::jsonb),
  ('immutability','Locked calculations are immutable; corrections by Adjustment only','{"immutable":true,"correction":"ADJUSTMENT"}'::jsonb)
) as x(rule_key,label,value)
on conflict (policy_version_id, rule_key) do nothing;

with p as (select id from public.policy_versions where policy_key='attribution_commission' and version='1.0' order by created_at limit 1)
insert into public.policy_open_items (policy_version_id,item_number,question,status)
select p.id, x.n, x.question, 'open' from p cross join (values
  (1,'Is the operating arrangement booth rental or percentage commission?'),
  (2,'If rent applies, what amount and period apply, and does it replace or accompany the split?'),
  (3,'Does the Shop absorb processing fees or deduct them before the split?'),
  (4,'What product commission rate applies, if any?'),
  (5,'Are retail products entirely Shop revenue?'),
  (6,'What imputed service value applies to each membership redemption?'),
  (7,'What per-visit value applies to each package?'),
  (8,'What deposit and no-show fee schedule applies?'),
  (9,'How many hours define a late cancellation?'),
  (10,'What is each currently engaged Barber start date?'),
  (11,'Is a signed independent-contractor agreement in place for each Barber?'),
  (12,'Confirm the final Barber count and service list.')
) as x(n,question)
on conflict (policy_version_id,item_number) do nothing;

commit;
