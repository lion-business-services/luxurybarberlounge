-- ============================================================================
-- 202608190023_memberships_portfolio_payouts.sql
-- ALREADY APPLIED to production 2026-08-19. Reproduced for repo history.
-- ============================================================================

-- 1. Membership signup funnel
create table if not exists public.membership_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete restrict,
  client_user_id uuid,
  email text not null,
  name text,
  phone text,
  square_payment_link_id text,
  square_order_id text,
  square_customer_id text,
  square_subscription_id text,
  checkout_url text,
  status text not null default 'created'
    check (status in ('created','paid','activated','failed','abandoned')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists membership_intents_order_idx on public.membership_checkout_intents(square_order_id);
create index if not exists membership_intents_status_idx on public.membership_checkout_intents(status);
alter table public.membership_checkout_intents enable row level security;
drop policy if exists membership_intents_no_client_access on public.membership_checkout_intents;
create policy membership_intents_no_client_access
  on public.membership_checkout_intents for all using (false) with check (false);

-- 2. Barber portfolio
create table if not exists public.barber_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  barber_profile_id uuid not null references public.barber_profiles(id) on delete cascade,
  uploaded_by uuid,
  storage_path text not null unique,
  caption text,
  alt_text text,
  mime_type text,
  size_bytes integer,
  width integer,
  height integer,
  client_consent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','archived')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.barber_portfolio_items enable row level security;

-- 3. Payout tracking on statements
alter table public.settlement_statements
  add column if not exists payout_method text,
  add column if not exists payout_reference text,
  add column if not exists paid_by uuid;
