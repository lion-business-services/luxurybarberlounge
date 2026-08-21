-- ============================================================================
-- 202608210026_auth_null_token_guard.sql
-- ALREADY APPLIED to production 2026-08-21. Reproduced for repo history.
--
-- ROOT CAUSE of the portal-wide login outage: auth.users rows created via SQL
-- (rather than the Auth API) left token columns NULL. Supabase's Go auth
-- service scans these into non-nullable strings, so ANY login request touching
-- such a row returned HTTP 500 -- surfacing to users as "Secure email delivery
-- is temporarily unavailable" and the Spanish app-error screen.
-- ============================================================================

create or replace function public.auth_users_normalise_tokens()
returns trigger language plpgsql security definer set search_path = auth, public as $$
begin
  new.confirmation_token         := coalesce(new.confirmation_token, '');
  new.recovery_token             := coalesce(new.recovery_token, '');
  new.email_change_token_new     := coalesce(new.email_change_token_new, '');
  new.email_change_token_current := coalesce(new.email_change_token_current, '');
  new.phone_change_token         := coalesce(new.phone_change_token, '');
  new.reauthentication_token     := coalesce(new.reauthentication_token, '');
  new.email_change               := coalesce(new.email_change, '');
  new.phone_change               := coalesce(new.phone_change, '');
  new.encrypted_password         := coalesce(new.encrypted_password, '');
  return new;
end; $$;

drop trigger if exists trg_auth_users_normalise_tokens on auth.users;
create trigger trg_auth_users_normalise_tokens
  before insert or update on auth.users
  for each row execute function public.auth_users_normalise_tokens();

-- One-time repair of rows already affected.
update auth.users set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change, ''),
  encrypted_password = coalesce(encrypted_password, '');
