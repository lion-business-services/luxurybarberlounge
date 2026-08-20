-- ============================================================================
-- 202608200025_availability_admin_membership.sql
-- ALREADY APPLIED to production 2026-08-20. Reproduced for repo history.
-- ============================================================================

-- Admin/owner access restricted to the official business email.
create or replace function public.enforce_admin_email_allowlist()
returns trigger language plpgsql security definer set search_path = public as $$
declare role_name text; user_email text;
begin
  select name into role_name from public.roles where id = new.role_id;
  if role_name not in ('Owner','Manager','Super Administrator') then return new; end if;
  select lower(email) into user_email from auth.users where id = new.user_id;
  if user_email is distinct from 'info@theluxurybarberlounge.com' then
    raise exception 'ADMIN_EMAIL_RESTRICTED: % cannot hold the % role.', coalesce(user_email,'(unknown)'), role_name
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;
drop trigger if exists trg_enforce_admin_email_allowlist on public.user_roles;
create trigger trg_enforce_admin_email_allowlist
  before insert or update on public.user_roles
  for each row execute function public.enforce_admin_email_allowlist();

-- Membership signup captures barber choice and client status.
alter table public.membership_checkout_intents
  add column if not exists barber_profile_id uuid references public.barber_profiles(id) on delete set null,
  add column if not exists client_status text check (client_status in ('new','existing'));
create index if not exists membership_intents_barber_idx
  on public.membership_checkout_intents(barber_profile_id);
