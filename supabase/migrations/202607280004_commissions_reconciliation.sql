-- Luxury Barber Lounge: versioned attribution, commission, settlement, reconciliation, and dispute ledger.
begin;

create table if not exists public.attribution_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default false,
  current_version integer not null default 1 check (current_version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attribution_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.attribution_rules(id) on delete cascade,
  version integer not null check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  location_id uuid references public.locations(id) on delete set null,
  barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  priority integer not null default 100,
  decision_config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rule_id, version),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default false,
  current_version integer not null default 1 check (current_version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commission_rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.commission_rules(id) on delete cascade,
  version integer not null check (version > 0),
  effective_from timestamptz not null,
  effective_to timestamptz,
  location_id uuid references public.locations(id) on delete set null,
  barber_user_id uuid references public.staff_profiles(user_id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  attribution_type text check (attribution_type is null or attribution_type in ('SHOP','BARBER','EXCEPTION')),
  priority integer not null default 100,
  barber_rate numeric(7,6) not null default .70 check (barber_rate between 0 and 1),
  shop_rate numeric(7,6) not null default .30 check (shop_rate between 0 and 1),
  fixed_barber_cents integer not null default 0,
  fixed_shop_cents integer not null default 0,
  tips_to_barber boolean not null default true,
  include_product_revenue boolean not null default false,
  include_membership_revenue boolean not null default false,
  include_taxes boolean not null default false,
  include_discounts boolean not null default false,
  include_processing_fees boolean not null default false,
  refund_treatment text not null default 'reduce_basis' check (refund_treatment in ('reduce_basis','separate_adjustment','ignore')),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rule_id, version),
  check (effective_to is null or effective_to > effective_from),
  check (barber_rate + shop_rate <= 1.000001)
);

create table if not exists public.settlement_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  review_deadline timestamptz,
  status text not null default 'open' check (status in ('open','calculating','review','locked','paid','voided')),
  locked_at timestamptz,
  locked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, location_id, starts_at, ends_at),
  check (ends_at > starts_at)
);

create table if not exists public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  settlement_period_id uuid references public.settlement_periods(id) on delete set null,
  run_type text not null default 'provisional' check (run_type in ('provisional','final','repair','replay')),
  status text not null default 'queued' check (status in ('queued','running','completed','completed_with_exceptions','failed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  initiated_by uuid references public.profiles(id) on delete set null,
  summary jsonb not null default '{}'::jsonb,
  error_summary text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commission_calculations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  settlement_period_id uuid references public.settlement_periods(id) on delete set null,
  reconciliation_run_id uuid references public.reconciliation_runs(id) on delete set null,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  client_user_id uuid references public.client_profiles(user_id) on delete set null,
  booking_metadata_id uuid references public.booking_metadata(id) on delete set null,
  square_booking_id text,
  square_order_id text,
  square_payment_id text,
  location_id uuid references public.locations(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  attribution_type text not null check (attribution_type in ('SHOP','BARBER','EXCEPTION')),
  attribution_source text not null,
  attribution_evidence jsonb not null default '{}'::jsonb,
  attribution_rule_version_id uuid references public.attribution_rule_versions(id) on delete restrict,
  commission_rule_version_id uuid references public.commission_rule_versions(id) on delete restrict,
  calculation_version integer not null default 1,
  gross_service_cents integer not null default 0,
  product_cents integer not null default 0,
  membership_cents integer not null default 0,
  package_cents integer not null default 0,
  addon_cents integer not null default 0,
  discount_cents integer not null default 0,
  tax_cents integer not null default 0,
  tip_cents integer not null default 0,
  deposit_cents integer not null default 0,
  refund_cents integer not null default 0,
  chargeback_cents integer not null default 0,
  cancellation_fee_cents integer not null default 0,
  no_show_fee_cents integer not null default 0,
  processing_fee_cents integer not null default 0,
  eligible_basis_cents integer not null default 0,
  excluded_cents integer not null default 0,
  barber_rate numeric(7,6) not null default 0,
  shop_rate numeric(7,6) not null default 0,
  barber_amount_cents integer not null default 0,
  shop_amount_cents integer not null default 0,
  status text not null default 'pending' check (status in ('pending','provisional','under_review','disputed','approved','adjusted','locked','paid','voided')),
  locked_at timestamptz,
  calculated_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, square_payment_id, barber_user_id, calculation_version)
);

create table if not exists public.commission_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  calculation_id uuid references public.commission_calculations(id) on delete set null,
  settlement_period_id uuid references public.settlement_periods(id) on delete set null,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  amount_cents integer not null,
  reason_code text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','applied','voided')),
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz
);

create table if not exists public.commission_disputes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  calculation_id uuid not null references public.commission_calculations(id) on delete restrict,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  reason_code text not null,
  explanation text not null,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('draft','submitted','needs_information','under_review','approved','denied','withdrawn','closed')),
  submitted_at timestamptz,
  due_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_reason text,
  adjustment_id uuid references public.commission_adjustments(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dispute_events (
  id bigint generated always as identity primary key,
  dispute_id uuid not null references public.commission_disputes(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  barber_visible boolean not null default true,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.settlement_statements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  settlement_period_id uuid not null references public.settlement_periods(id) on delete cascade,
  barber_user_id uuid not null references public.staff_profiles(user_id) on delete restrict,
  gross_basis_cents integer not null default 0,
  tips_cents integer not null default 0,
  adjustments_cents integer not null default 0,
  refunds_cents integer not null default 0,
  final_amount_cents integer not null default 0,
  status text not null default 'provisional' check (status in ('provisional','review','final','paid','voided')),
  statement_snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (settlement_period_id, barber_user_id)
);

create table if not exists public.reconciliation_exceptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reconciliation_run_id uuid not null references public.reconciliation_runs(id) on delete cascade,
  resource_type text not null,
  resource_id text,
  exception_code text not null,
  severity text not null default 'warning' check (severity in ('info','warning','error','critical')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','reviewing','resolved','ignored')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_attribution_rule_effective on public.attribution_rule_versions (effective_from, effective_to, priority);
create index if not exists idx_commission_rule_effective on public.commission_rule_versions (effective_from, effective_to, priority);
create index if not exists idx_settlement_periods_status on public.settlement_periods (business_id, status, starts_at desc);
create index if not exists idx_commission_barber_period on public.commission_calculations (barber_user_id, settlement_period_id, status);
create index if not exists idx_commission_payment on public.commission_calculations (business_id, square_payment_id);
create index if not exists idx_disputes_barber_status on public.commission_disputes (barber_user_id, status, created_at desc);
create index if not exists idx_reconciliation_exceptions on public.reconciliation_exceptions (reconciliation_run_id, status, severity);

DO $$ BEGIN
  drop trigger if exists attribution_rules_updated_at on public.attribution_rules;
  create trigger attribution_rules_updated_at before update on public.attribution_rules for each row execute function public.set_updated_at();
  drop trigger if exists commission_rules_updated_at on public.commission_rules;
  create trigger commission_rules_updated_at before update on public.commission_rules for each row execute function public.set_updated_at();
  drop trigger if exists settlement_periods_updated_at on public.settlement_periods;
  create trigger settlement_periods_updated_at before update on public.settlement_periods for each row execute function public.set_updated_at();
  drop trigger if exists commission_calculations_updated_at on public.commission_calculations;
  create trigger commission_calculations_updated_at before update on public.commission_calculations for each row execute function public.set_updated_at();
  drop trigger if exists commission_disputes_updated_at on public.commission_disputes;
  create trigger commission_disputes_updated_at before update on public.commission_disputes for each row execute function public.set_updated_at();
  drop trigger if exists settlement_statements_updated_at on public.settlement_statements;
  create trigger settlement_statements_updated_at before update on public.settlement_statements for each row execute function public.set_updated_at();
END $$;

comment on table public.commission_calculations is 'Immutable financial calculation snapshots. Correct settled history with adjustment rows, never silent rewrites.';
comment on table public.settlement_statements is 'Reporting only. This platform does not move funds unless a separately approved payout integration is enabled.';

commit;
