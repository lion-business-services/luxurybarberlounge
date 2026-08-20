-- ============================================================================
-- 202608190024_barber_role_autogrant.sql
-- ALREADY APPLIED to production 2026-08-19. Reproduced for repo history.
--
-- Barbers were being linked to auth users without receiving the Barber role,
-- so they logged in and landed on the CLIENT portal. This makes the role grant
-- automatic and impossible to forget.
-- ============================================================================

create unique index if not exists user_roles_user_role_unique
  on public.user_roles(user_id, role_id);

create or replace function public.ensure_barber_role_on_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  barber_role_id uuid;
  client_role_id uuid;
begin
  if new.staff_user_id is null then return new; end if;
  select id into barber_role_id from public.roles where name = 'Barber';
  select id into client_role_id from public.roles where name = 'Client';
  if barber_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.staff_user_id, barber_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;
  if client_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.staff_user_id, client_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_barber_role_on_link on public.barber_profiles;
create trigger trg_ensure_barber_role_on_link
  after insert or update of staff_user_id on public.barber_profiles
  for each row execute function public.ensure_barber_role_on_link();
