-- Luxury Barber Lounge: production business baseline, reliable client provisioning,
-- portal-specific RLS, and indexes required by the separated client and owner CRM.
begin;

insert into public.businesses (
  id, name, slug, legal_name, phone, email, website_url, timezone, default_language, status, metadata
) values (
  '00000000-0000-4000-8000-000000000001',
  'Luxury Barber Lounge',
  'luxury-barber-lounge',
  'Luxury Barber Lounge, LLC',
  '609-384-5171',
  'info@theluxurybarberlounge.com',
  'https://www.theluxurybarberlounge.com',
  'America/New_York',
  'en',
  'active',
  '{"source":"confirmed_owner_information","production_baseline":true}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  phone = excluded.phone,
  email = excluded.email,
  website_url = excluded.website_url,
  timezone = excluded.timezone,
  status = 'active',
  metadata = public.businesses.metadata || excluded.metadata,
  updated_at = timezone('utc', now());

insert into public.locations (
  id, business_id, name, slug, phone, email, address_line_1, city, region, postal_code,
  country_code, timezone, active
)
select
  '00000000-0000-4000-8000-000000000002', b.id, 'Northfield', 'northfield',
  '609-384-5171', 'info@theluxurybarberlounge.com', '801 Tilton Road, Suite 106',
  'Northfield', 'NJ', '08225', 'US', 'America/New_York', true
from public.businesses b where b.slug = 'luxury-barber-lounge'
on conflict (business_id, slug) do update set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  address_line_1 = excluded.address_line_1,
  city = excluded.city,
  region = excluded.region,
  postal_code = excluded.postal_code,
  timezone = excluded.timezone,
  active = true,
  updated_at = timezone('utc', now());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_role_id uuid;
  production_business_id uuid;
begin
  insert into public.profiles (id, full_name, display_name, phone, preferred_language)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name',''),
    nullif(new.raw_user_meta_data->>'display_name',''),
    nullif(new.phone,''),
    case when new.raw_user_meta_data->>'preferred_language' = 'es' then 'es' else 'en' end
  )
  on conflict (id) do update set updated_at = timezone('utc', now());

  select id into client_role_id from public.roles where key = 'client' limit 1;
  select id into production_business_id from public.businesses where slug = 'luxury-barber-lounge' limit 1;

  if client_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, client_role_id)
    on conflict do nothing;
  end if;

  insert into public.client_profiles (user_id, business_id)
  values (new.id, production_business_id)
  on conflict (user_id) do update set
    business_id = coalesce(public.client_profiles.business_id, excluded.business_id),
    updated_at = timezone('utc', now());

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill verified accounts created before this migration.
insert into public.client_profiles (user_id, business_id)
select distinct ur.user_id, b.id
from public.user_roles ur
join public.roles r on r.id = ur.role_id and r.key = 'client'
cross join lateral (select id from public.businesses where slug = 'luxury-barber-lounge' limit 1) b
left join public.client_profiles cp on cp.user_id = ur.user_id
where cp.user_id is null
on conflict (user_id) do nothing;

-- Client access to Square mirror records is read-only and tied to the verified mapping.
drop policy if exists square_customers_client_read on public.square_customers;
create policy square_customers_client_read on public.square_customers
for select using (client_user_id = auth.uid());

drop policy if exists square_bookings_client_read on public.square_bookings;
create policy square_bookings_client_read on public.square_bookings
for select using (
  exists (
    select 1 from public.booking_metadata b
    where b.client_user_id = auth.uid()
      and b.square_booking_id = square_bookings.square_id
  )
);

drop policy if exists square_orders_client_read on public.square_orders;
create policy square_orders_client_read on public.square_orders
for select using (
  exists (
    select 1 from public.client_profiles c
    where c.user_id = auth.uid()
      and c.square_customer_id is not null
      and c.square_customer_id = square_orders.customer_square_id
  )
);

drop policy if exists square_payments_client_read on public.square_payments;
create policy square_payments_client_read on public.square_payments
for select using (
  exists (
    select 1 from public.client_profiles c
    where c.user_id = auth.uid()
      and c.square_customer_id is not null
      and c.square_customer_id = square_payments.square_customer_id
  )
);

drop policy if exists square_refunds_client_read on public.square_refunds;
create policy square_refunds_client_read on public.square_refunds
for select using (
  exists (
    select 1 from public.square_payments p
    join public.client_profiles c on c.square_customer_id = p.square_customer_id
    where c.user_id = auth.uid()
      and p.square_id = square_refunds.square_payment_id
  )
);

drop policy if exists notification_jobs_client_read on public.notification_jobs;
create policy notification_jobs_client_read on public.notification_jobs
for select using (user_id = auth.uid());

-- Owner and manager CRM access to operational mirrors and lifecycle records.
drop policy if exists square_customers_staff_read on public.square_customers;
create policy square_customers_staff_read on public.square_customers
for select using (public.can_operate_business(business_id));

drop policy if exists square_orders_staff_read on public.square_orders;
create policy square_orders_staff_read on public.square_orders
for select using (public.can_operate_business(business_id));

drop policy if exists square_payments_staff_read on public.square_payments;
create policy square_payments_staff_read on public.square_payments
for select using (public.can_operate_business(business_id));

drop policy if exists square_refunds_staff_read on public.square_refunds;
create policy square_refunds_staff_read on public.square_refunds
for select using (public.can_operate_business(business_id));

drop policy if exists memberships_staff_read on public.memberships;
create policy memberships_staff_read on public.memberships
for select using (public.can_operate_business(business_id));

drop policy if exists memberships_admin_write on public.memberships;
create policy memberships_admin_write on public.memberships
for all using (public.can_manage_business(business_id))
with check (public.can_manage_business(business_id));

drop policy if exists notification_jobs_admin_read on public.notification_jobs;
create policy notification_jobs_admin_read on public.notification_jobs
for select using (business_id is not null and public.can_admin_business(business_id));

drop policy if exists notification_deliveries_admin_read on public.notification_deliveries;
create policy notification_deliveries_admin_read on public.notification_deliveries
for select using (
  exists (
    select 1 from public.notification_jobs j
    where j.id = notification_deliveries.job_id
      and j.business_id is not null
      and public.can_admin_business(j.business_id)
  )
);

drop policy if exists sync_failures_admin_read on public.sync_failures;
create policy sync_failures_admin_read on public.sync_failures
for select using (public.can_admin_business(business_id));

drop policy if exists scheduled_jobs_admin_read on public.scheduled_jobs;
create policy scheduled_jobs_admin_read on public.scheduled_jobs
for select using (business_id is not null and public.can_admin_business(business_id));

create index if not exists idx_booking_metadata_client_created
  on public.booking_metadata (client_user_id, created_at desc);
create index if not exists idx_queue_entries_client_active
  on public.queue_entries (client_id, status, joined_at desc);
create index if not exists idx_memberships_client_status
  on public.memberships (client_user_id, status, created_at desc);
create index if not exists idx_square_orders_customer_synced
  on public.square_orders (customer_square_id, synced_at desc);
create index if not exists idx_notification_jobs_user_created
  on public.notification_jobs (user_id, created_at desc);
create index if not exists idx_square_bookings_business_start
  on public.square_bookings (business_id, starts_at);
create index if not exists idx_sync_failures_business_created
  on public.sync_failures (business_id, created_at desc);

commit;
