-- ============================================================================
-- 202609301200_archive_barber_elvis.sql
-- STEP 2 of 2: remove Elvis from the live platform.
-- Where to run: Supabase Dashboard > SQL Editor > New query > paste > Run
-- Run supabase/manual/elvis-removal-01-preview.sql first.
--
-- What it does:
--   * Backs up every row it touches into the private schema lbl_backup.
--   * Archives the barber profile (hidden from the website, booking, queue,
--     Square sync, and the admin barber list).
--   * Turns off his services, schedule, and images.
--   * Revokes his barber portal access and pending invitations.
--   * Clears him as any client's preferred barber.
--
-- What it does NOT do:
--   * Delete past appointments, payments, commissions, or statements.
--     Those are financial history and stay intact. A hard delete is blocked
--     by the database anyway (appointments reference the profile).
--
-- Safety: the whole script runs in one transaction and stops without
-- changing anything if Elvis still has upcoming bookings or active walk-ins.
-- It is safe to run more than once.
-- ============================================================================
begin;

create schema if not exists lbl_backup;
revoke all on schema lbl_backup from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema lbl_backup from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on schema lbl_backup from authenticated';
  end if;
end;
$$;

do $$
declare
  v_business_id uuid;
  v_profile_id uuid;
  v_staff_user_id uuid;
  v_upcoming integer;
  v_queue integer;
begin
  select id into v_business_id from public.businesses where slug = 'luxury-barber-lounge';
  if v_business_id is null then
    raise notice 'Business luxury-barber-lounge not found. Nothing changed.';
    return;
  end if;

  select id, staff_user_id into v_profile_id, v_staff_user_id
  from public.barber_profiles
  where business_id = v_business_id and slug = 'elvis';

  if v_profile_id is null then
    raise notice 'Barber profile elvis not found. Nothing changed.';
    return;
  end if;

  -- Guard: never strand a client with an archived barber.
  select count(*) into v_upcoming
  from public.appointments
  where barber_profile_id = v_profile_id
    and starts_at >= timezone('utc', now())
    and status in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service');
  if v_upcoming > 0 then
    raise exception 'Elvis still has % upcoming appointment(s). Reassign or cancel them in Admin > Appointments, then run this again. Nothing was changed.', v_upcoming;
  end if;

  if v_staff_user_id is not null then
    select count(*) into v_queue
    from public.queue_assignments qa
    join public.queue_entries qe on qe.id = qa.queue_entry_id
    where qa.barber_user_id = v_staff_user_id
      and qa.active = true
      and qe.status in ('waiting','confirmed','checked_in','assigned','called','ready','in_service');
    if v_queue > 0 then
      raise exception 'Elvis still has % active walk-in queue assignment(s). Reassign them in Admin > Queue, then run this again. Nothing was changed.', v_queue;
    end if;
  end if;

  -- Backups (one snapshot per run, stamped with backed_up_at).
  create table if not exists lbl_backup.elvis_barber_profiles as select now() as backed_up_at, * from public.barber_profiles with no data;
  insert into lbl_backup.elvis_barber_profiles select now(), * from public.barber_profiles where id = v_profile_id;

  create table if not exists lbl_backup.elvis_barber_profile_services as select now() as backed_up_at, * from public.barber_profile_services with no data;
  insert into lbl_backup.elvis_barber_profile_services select now(), * from public.barber_profile_services where barber_profile_id = v_profile_id;

  create table if not exists lbl_backup.elvis_barber_schedules as select now() as backed_up_at, * from public.barber_schedules with no data;
  insert into lbl_backup.elvis_barber_schedules select now(), * from public.barber_schedules where barber_profile_id = v_profile_id;

  create table if not exists lbl_backup.elvis_barber_images as select now() as backed_up_at, * from public.barber_images with no data;
  insert into lbl_backup.elvis_barber_images select now(), * from public.barber_images where barber_profile_id = v_profile_id;

  create table if not exists lbl_backup.elvis_user_invitations as select now() as backed_up_at, * from public.user_invitations with no data;
  insert into lbl_backup.elvis_user_invitations select now(), * from public.user_invitations
  where barber_profile_id = v_profile_id or lower(email::text) = 'elvis29p@gmail.com';

  create table if not exists lbl_backup.elvis_user_roles as select now() as backed_up_at, * from public.user_roles with no data;
  create table if not exists lbl_backup.elvis_staff_profiles as select now() as backed_up_at, * from public.staff_profiles with no data;
  create table if not exists lbl_backup.elvis_staff_services as select now() as backed_up_at, * from public.staff_services with no data;
  if v_staff_user_id is not null then
    insert into lbl_backup.elvis_user_roles select now(), * from public.user_roles where user_id = v_staff_user_id;
    insert into lbl_backup.elvis_staff_profiles select now(), * from public.staff_profiles where user_id = v_staff_user_id;
    insert into lbl_backup.elvis_staff_services select now(), * from public.staff_services where staff_user_id = v_staff_user_id;
  end if;

  create table if not exists lbl_backup.elvis_client_preferences (backed_up_at timestamptz, client_id uuid, preferred_barber_profile_id uuid);
  insert into lbl_backup.elvis_client_preferences
  select now(), id, preferred_barber_profile_id from public.clients where preferred_barber_profile_id = v_profile_id;

  -- Archive the profile. The website, booking, queue, and Square sync only
  -- read active, published barbers, so this removes him everywhere.
  update public.barber_profiles
  set active = false,
      featured = false,
      status = 'archived',
      accepting_walk_ins = false,
      updated_at = timezone('utc', now())
  where id = v_profile_id;

  update public.barber_profile_services set active = false where barber_profile_id = v_profile_id and active;
  update public.barber_schedules
  set active = false, effective_to = coalesce(effective_to, current_date)
  where barber_profile_id = v_profile_id and active;
  update public.barber_images set active = false where barber_profile_id = v_profile_id and active;

  update public.user_invitations set status = 'revoked'
  where status = 'pending'
    and (barber_profile_id = v_profile_id or lower(email::text) = 'elvis29p@gmail.com');

  update public.clients set preferred_barber_profile_id = null where preferred_barber_profile_id = v_profile_id;

  if v_staff_user_id is not null then
    -- Remove barber portal access. The Client role is left alone so he can
    -- still sign in as a normal customer if he ever books.
    delete from public.user_roles ur
    using public.roles r
    where r.id = ur.role_id and r.key = 'barber' and ur.user_id = v_staff_user_id;

    update public.staff_services set active = false where staff_user_id = v_staff_user_id and active;
    update public.staff_profiles set active = false where user_id = v_staff_user_id;
  end if;

  raise notice 'Elvis (%) archived. Backups are in schema lbl_backup.', v_profile_id;
end;
$$;

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'lbl_backup' loop
    execute format('alter table lbl_backup.%I enable row level security', t.tablename);
  end loop;
end;
$$;

commit;
