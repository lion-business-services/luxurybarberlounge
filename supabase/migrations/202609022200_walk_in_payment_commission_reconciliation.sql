alter table public.queue_entries
  add column if not exists client_record_id uuid references public.clients(id) on delete set null;

alter table public.commission_calculations
  add column if not exists queue_entry_id uuid references public.queue_entries(id) on delete set null;

create unique index if not exists idx_commission_calculations_queue_entry
  on public.commission_calculations(queue_entry_id)
  where queue_entry_id is not null;

create table if not exists public.walk_in_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  client_record_id uuid references public.clients(id) on delete set null,
  barber_profile_id uuid references public.barber_profiles(id) on delete set null,
  barber_user_id uuid,
  payment_method text not null check (payment_method in ('cash','square')),
  status text not null default 'pending' check (status in ('pending','paid','refunded','voided','unmatched')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  tip_cents integer not null default 0 check (tip_cents >= 0),
  processing_fee_cents integer not null default 0 check (processing_fee_cents >= 0),
  currency text not null default 'USD',
  square_customer_id text,
  square_order_id text,
  square_payment_id text,
  square_payment_link_id text,
  square_payment_url text,
  square_receipt_number text,
  square_receipt_url text,
  paid_at timestamptz,
  recorded_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(queue_entry_id)
);

create unique index if not exists idx_walk_in_payments_square_payment
  on public.walk_in_payments(square_payment_id)
  where square_payment_id is not null;

create index if not exists idx_walk_in_payments_business_paid
  on public.walk_in_payments(business_id, paid_at desc)
  where status = 'paid';

create index if not exists idx_walk_in_payments_square_order
  on public.walk_in_payments(square_order_id)
  where square_order_id is not null;

alter table public.walk_in_payments enable row level security;

create or replace trigger walk_in_payments_updated_at
before update on public.walk_in_payments
for each row execute function public.set_updated_at();
