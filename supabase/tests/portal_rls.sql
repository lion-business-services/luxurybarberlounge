-- Portal RLS structural smoke test. Run against a migrated staging database.
-- This test is intentionally read-only and fails closed when a required table
-- lacks RLS or a client/admin policy family.
do $$
declare
  missing text[];
begin
  select array_agg(required_table order by required_table)
  into missing
  from unnest(array[
    'profiles','client_profiles','booking_metadata','queue_entries','square_orders',
    'memberships','notification_jobs','privacy_requests','client_preferences',
    'client_notes','client_history_events','order_extensions','order_support_cases',
    'membership_requests','user_roles','audit_logs','integrations'
  ]) required_table
  where not exists (
    select 1 from pg_tables t
    where t.schemaname = 'public' and t.tablename = required_table and t.rowsecurity
  );
  if missing is not null then
    raise exception 'Required portal tables without RLS: %', missing;
  end if;
end $$;

do $$
declare
  missing text[];
begin
  select array_agg(required_table order by required_table)
  into missing
  from unnest(array[
    'client_profiles','booking_metadata','queue_entries','square_orders','memberships',
    'notification_jobs','privacy_requests','client_preferences','client_notes',
    'client_history_events','order_extensions','order_support_cases','membership_requests'
  ]) required_table
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = required_table
  );
  if missing is not null then
    raise exception 'Client portal tables without policies: %', missing;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'can_operate_business' and pronamespace = 'public'::regnamespace) then
    raise exception 'can_operate_business helper is missing';
  end if;
  if not exists (select 1 from pg_proc where proname = 'can_manage_business' and pronamespace = 'public'::regnamespace) then
    raise exception 'can_manage_business helper is missing';
  end if;
  if not exists (select 1 from pg_proc where proname = 'can_admin_business' and pronamespace = 'public'::regnamespace) then
    raise exception 'can_admin_business helper is missing';
  end if;
end $$;

select 'portal_rls_structural_smoke_test_passed' as result;
