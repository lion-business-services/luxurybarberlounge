-- ============================================================================
-- 202608190021_commission_by_profile_and_test_claims.sql
-- ALREADY APPLIED to production 2026-08-19. Reproduced for repo history.
-- Re-running is a no-op.
-- ============================================================================

-- Commissions must not depend on a barber having a portal login.
alter table public.commission_calculations
  add column if not exists barber_profile_id uuid references public.barber_profiles(id) on delete set null;
alter table public.commission_calculations alter column barber_user_id drop not null;
create index if not exists commission_calculations_barber_profile_idx
  on public.commission_calculations(barber_profile_id);
alter table public.commission_calculations
  drop constraint if exists commission_calculations_barber_identity_present;
alter table public.commission_calculations
  add constraint commission_calculations_barber_identity_present
  check (barber_user_id is not null or barber_profile_id is not null);

alter table public.settlement_statements
  add column if not exists barber_profile_id uuid references public.barber_profiles(id) on delete set null;
alter table public.settlement_statements alter column barber_user_id drop not null;

-- Test/supervisor claim capability.
alter table public.barber_profiles
  add column if not exists can_claim_for_any_barber boolean not null default false;
update public.barber_profiles set can_claim_for_any_barber = true
  where portal_email = 'support@lbsprocess.com';
