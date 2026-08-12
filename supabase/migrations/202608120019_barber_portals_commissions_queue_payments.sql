-- Barber portal identity mapping, modern appointment commission linkage, and deployment-ready access seeds.
begin;

alter table public.barber_profiles
  add column if not exists portal_email citext;

create unique index if not exists barber_profiles_portal_email_unique
  on public.barber_profiles (business_id, lower(portal_email::text))
  where portal_email is not null;

alter table public.user_invitations
  add column if not exists barber_profile_id uuid references public.barber_profiles(id) on delete set null;

create index if not exists idx_user_invitations_barber_profile
  on public.user_invitations (barber_profile_id, status, created_at desc)
  where barber_profile_id is not null;

alter table public.commission_calculations
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists client_record_id uuid references public.clients(id) on delete set null;

create index if not exists idx_commission_appointment
  on public.commission_calculations (appointment_id)
  where appointment_id is not null;

create table if not exists public.appointment_payment_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  purpose text not null default 'deposit' check (purpose in ('deposit','balance')),
  amount_cents integer not null check (amount_cents > 0),
  square_payment_link_id text not null,
  square_order_id text not null,
  checkout_url text not null,
  status text not null default 'created' check (status in ('created','paid','failed','refunded','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  unique (business_id, square_order_id),
  unique (appointment_id, purpose, square_payment_link_id)
);
create index if not exists idx_appointment_payment_links_appointment on public.appointment_payment_links (appointment_id, purpose, created_at desc);
alter table public.appointment_payment_links enable row level security;

-- Owner-provided private portal emails. These are deliberately not public profile content.
with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge' limit 1
), mapping(slug,email) as (
  values
    ('angelica-aquino','angelicaakaica03@icloud.com'),
    ('hommy-rivera','riverahommy3@gmail.com'),
    ('jose','jochylp12@gmail.com'),
    ('elvis','elvis29p@gmail.com'),
    ('russ-hawkins','russell3hawkins@gmail.com'),
    ('daniel-penalo','daniel.penalo97@gmail.com')
)
update public.barber_profiles bp
set portal_email = mapping.email::citext
from b, mapping
where bp.business_id = b.id and bp.slug = mapping.slug;

-- Seed pending barber access so each supplied email can request a normal Supabase OTP.
-- Login authorization still occurs only after the email code is verified server-side.
with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge' limit 1
), l as (
  select l.id, l.business_id
  from public.locations l join b on b.id = l.business_id
  where l.slug = 'northfield' limit 1
), candidates as (
  select bp.business_id, bp.id as barber_profile_id, bp.portal_email::text as email, l.id as location_id
  from public.barber_profiles bp
  join b on b.id = bp.business_id
  left join l on l.business_id = bp.business_id
  where bp.portal_email is not null
)
insert into public.user_invitations (
  business_id,email,intended_role,location_id,invited_by,token_hash,status,expires_at,barber_profile_id
)
select c.business_id,c.email,'barber',c.location_id,null,
       encode(gen_random_bytes(32),'hex'),'pending',timezone('utc',now()) + interval '365 days',c.barber_profile_id
from candidates c
where not exists (
  select 1 from public.user_invitations ui
  where ui.business_id = c.business_id
    and lower(ui.email::text) = lower(c.email)
    and ui.intended_role = 'barber'
    and ui.status = 'pending'
);

-- Private test barber portal requested by the site owner. It intentionally has no public barber profile.
with b as (
  select id from public.businesses where slug = 'luxury-barber-lounge' limit 1
), l as (
  select l.id, l.business_id
  from public.locations l join b on b.id = l.business_id
  where l.slug = 'northfield' limit 1
)
insert into public.user_invitations (
  business_id,email,intended_role,location_id,invited_by,token_hash,status,expires_at,barber_profile_id
)
select b.id,'support@lbsprocess.com','barber',l.id,null,
       encode(gen_random_bytes(32),'hex'),'pending',timezone('utc',now()) + interval '365 days',null
from b left join l on l.business_id = b.id
where not exists (
  select 1 from public.user_invitations ui
  where ui.business_id = b.id
    and lower(ui.email::text) = 'support@lbsprocess.com'
    and ui.intended_role = 'barber'
    and ui.status = 'pending'
);

comment on column public.barber_profiles.portal_email is 'Private portal-login email supplied by the owner. Never expose on the public barber profile unless separately approved as public contact content.';
comment on column public.user_invitations.barber_profile_id is 'Optional public barber profile to link after the invited barber verifies the email OTP.';
comment on column public.commission_calculations.appointment_id is 'Modern appointment source used by the production booking engine.';
comment on column public.commission_calculations.client_record_id is 'Modern guest-or-authenticated client record associated with the calculation.';
comment on table public.appointment_payment_links is 'Server-only mapping between website appointment checkout links and Square orders. Deposit orders are excluded from service commission until final service settlement.';

commit;
