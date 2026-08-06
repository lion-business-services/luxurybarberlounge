-- Luxury Barber Lounge production appointment booking engine.
-- Supabase is the immediate operational source of truth until Square Bookings mappings are enabled.

begin;

create extension if not exists btree_gist;

insert into public.businesses (name, slug, legal_name, phone, email, website_url, timezone, default_language, status)
values ('Luxury Barber Lounge','luxury-barber-lounge','Luxury Barber Lounge, LLC','609-384-5171','info@theluxurybarberlounge.com','https://theluxurybarberlounge.com','America/New_York','en','active')
on conflict (slug) do update set name=excluded.name,legal_name=excluded.legal_name,phone=excluded.phone,email=excluded.email,website_url=excluded.website_url,timezone=excluded.timezone,status=excluded.status;

with b as (select id from public.businesses where slug='luxury-barber-lounge')
insert into public.locations (business_id,name,slug,phone,email,address_line_1,city,region,postal_code,country_code,timezone,active)
select id,'Northfield Lounge','northfield','609-384-5171','info@theluxurybarberlounge.com','801 Tilton Road, Suite 106','Northfield','NJ','08225','US','America/New_York',true from b
on conflict (business_id,slug) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,address_line_1=excluded.address_line_1,city=excluded.city,region=excluded.region,postal_code=excluded.postal_code,timezone=excluded.timezone,active=true;

with l as (
  select l.id from public.locations l join public.businesses b on b.id=l.business_id
  where b.slug='luxury-barber-lounge' and l.slug='northfield'
), schedule(weekday,opens_at,closes_at,closed) as (
  values (0,null::time,null::time,true),(1,null::time,null::time,true),(2,'09:00'::time,'19:00'::time,false),(3,'09:00'::time,'19:00'::time,false),(4,'09:00'::time,'20:00'::time,false),(5,'09:00'::time,'20:00'::time,false),(6,'08:00'::time,'18:00'::time,false)
)
insert into public.business_hours (location_id,weekday,opens_at,closes_at,closed)
select l.id,s.weekday,s.opens_at,s.closes_at,s.closed from l cross join schedule s
on conflict (location_id,weekday) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,closed=excluded.closed;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  auth_user_id uuid references public.profiles(id) on delete set null,
  square_customer_id text,
  first_name text not null,
  last_name text not null,
  email citext,
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  preferred_barber_profile_id uuid references public.barber_profiles(id) on delete set null,
  grooming_preferences jsonb not null default '{}'::jsonb,
  communication_preferences jsonb not null default '{}'::jsonb,
  referral_source text,
  acquisition_source text,
  status text not null default 'active' check (status in ('active','inactive','blocked','merged')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check (email is not null or phone is not null)
);
create unique index if not exists clients_business_auth_unique on public.clients (business_id,auth_user_id) where auth_user_id is not null;
create unique index if not exists clients_business_email_unique on public.clients (business_id,lower(email::text)) where email is not null and status<>'merged';
create unique index if not exists clients_business_phone_unique on public.clients (business_id,phone) where phone is not null and status<>'merged';
create index if not exists idx_clients_lookup on public.clients (business_id,last_name,first_name);

create table if not exists public.barber_profile_services (
  barber_profile_id uuid not null references public.barber_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  duration_override_minutes integer check (duration_override_minutes is null or duration_override_minutes>0),
  price_override_cents integer check (price_override_cents is null or price_override_cents>=0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc',now()),
  primary key (barber_profile_id,service_id)
);

alter table public.barber_schedules add column if not exists barber_profile_id uuid references public.barber_profiles(id) on delete cascade;
alter table public.barber_schedules alter column barber_user_id drop not null;
alter table public.barber_schedules drop constraint if exists barber_schedules_identity_check;
alter table public.barber_schedules add constraint barber_schedules_identity_check check (barber_user_id is not null or barber_profile_id is not null);
create unique index if not exists barber_profile_schedules_unique on public.barber_schedules (barber_profile_id,location_id,weekday,effective_from) where barber_profile_id is not null;

alter table public.barber_breaks add column if not exists barber_profile_id uuid references public.barber_profiles(id) on delete cascade;
alter table public.barber_breaks alter column barber_user_id drop not null;
alter table public.barber_breaks drop constraint if exists barber_breaks_identity_check;
alter table public.barber_breaks add constraint barber_breaks_identity_check check (barber_user_id is not null or barber_profile_id is not null);

create table if not exists public.barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_profile_id uuid not null references public.barber_profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'approved' check (status in ('requested','approved','declined','cancelled')),
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check (ends_at>starts_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  auth_user_id uuid references public.profiles(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  barber_profile_id uuid not null references public.barber_profiles(id) on delete restrict,
  assigned_staff_user_id uuid references public.staff_profiles(user_id) on delete set null,
  public_reference text not null unique,
  manage_token_hash text not null,
  square_booking_id text,
  square_customer_id text,
  square_order_id text,
  service_name_snapshot text not null,
  service_price_snapshot_cents integer not null check (service_price_snapshot_cents>=0),
  service_duration_snapshot_minutes integer not null check (service_duration_snapshot_minutes>0),
  addon_snapshot jsonb not null default '[]'::jsonb,
  barber_name_snapshot text not null,
  client_name_snapshot text not null,
  client_email_snapshot citext,
  client_phone_snapshot text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/New_York',
  status text not null default 'confirmed' check (status in ('draft','slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service','completed','rescheduled','cancelled_by_client','cancelled_by_business','no_show','declined','expired','failed')),
  booking_source text not null default 'website',
  campaign_source text,
  campaign_medium text,
  campaign_name text,
  referral_source text,
  deposit_required_cents integer not null default 0 check (deposit_required_cents>=0),
  deposit_status text not null default 'not_required' check (deposit_status in ('not_required','pending','paid','refunded','failed')),
  client_notes text,
  internal_notes text,
  policy_version text not null,
  policy_accepted_at timestamptz not null,
  email_consent boolean not null default true,
  sms_consent boolean not null default false,
  idempotency_key uuid not null unique,
  formsubmit_status text not null default 'queued' check (formsubmit_status in ('queued','awaiting_activation','processing','sent','failed','retrying','disabled')),
  client_confirmation_status text not null default 'queued' check (client_confirmation_status in ('queued','sent','failed','suppressed')),
  barber_notification_status text not null default 'queued' check (barber_notification_status in ('queued','sent','failed','suppressed')),
  sync_status text not null default 'supabase_primary' check (sync_status in ('supabase_primary','square_pending','square_synced','square_failed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now()),
  check (ends_at>starts_at)
);
alter table public.appointments drop constraint if exists appointments_no_active_overlap;
alter table public.appointments add constraint appointments_no_active_overlap exclude using gist (barber_profile_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where (status in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service'));
create index if not exists idx_appointments_business_start on public.appointments (business_id,starts_at);
create index if not exists idx_appointments_client on public.appointments (client_id,starts_at desc);
create index if not exists idx_appointments_auth_user on public.appointments (auth_user_id,starts_at desc) where auth_user_id is not null;
create index if not exists idx_appointments_barber on public.appointments (barber_profile_id,starts_at);
create index if not exists idx_appointments_status on public.appointments (business_id,status,starts_at);

create table if not exists public.appointment_addons (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  addon_id uuid references public.service_addons(id) on delete set null,
  addon_name_snapshot text not null,
  price_snapshot_cents integer not null default 0,
  duration_snapshot_minutes integer not null default 0,
  created_at timestamptz not null default timezone('utc',now()),
  unique (appointment_id,addon_name_snapshot)
);
create table if not exists public.appointment_assignments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  barber_profile_id uuid not null references public.barber_profiles(id) on delete restrict,
  assigned_staff_user_id uuid references public.staff_profiles(user_id) on delete set null,
  assignment_source text not null check (assignment_source in ('booking','first_available','admin','reception','system')),
  reason text,
  assigned_by uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  assigned_at timestamptz not null default timezone('utc',now()),
  released_at timestamptz
);
create unique index if not exists appointment_assignments_one_active on public.appointment_assignments (appointment_id) where active;

alter table public.appointment_status_history add column if not exists appointment_id uuid references public.appointments(id) on delete cascade;
alter table public.appointment_status_history alter column booking_metadata_id drop not null;
alter table public.appointment_status_history drop constraint if exists appointment_status_history_target_check;
alter table public.appointment_status_history add constraint appointment_status_history_target_check check (booking_metadata_id is not null or appointment_id is not null);
alter table public.appointment_notes add column if not exists appointment_id uuid references public.appointments(id) on delete cascade;
alter table public.appointment_notes alter column booking_metadata_id drop not null;
alter table public.appointment_notes drop constraint if exists appointment_notes_target_check;
alter table public.appointment_notes add constraint appointment_notes_target_check check (booking_metadata_id is not null or appointment_id is not null);
alter table public.appointment_reference_images add column if not exists appointment_id uuid references public.appointments(id) on delete cascade;
alter table public.appointment_reference_images alter column booking_metadata_id drop not null;
alter table public.appointment_reference_images drop constraint if exists appointment_reference_images_target_check;
alter table public.appointment_reference_images add constraint appointment_reference_images_target_check check (booking_metadata_id is not null or appointment_id is not null);

create table if not exists public.slot_holds (
  id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,location_id uuid not null references public.locations(id) on delete cascade,barber_profile_id uuid not null references public.barber_profiles(id) on delete cascade,service_id uuid not null references public.services(id) on delete cascade,idempotency_key uuid not null unique,starts_at timestamptz not null,ends_at timestamptz not null,expires_at timestamptz not null,status text not null default 'active' check (status in ('active','consumed','expired','released')),created_at timestamptz not null default timezone('utc',now()),check (ends_at>starts_at),check (expires_at>created_at)
);
alter table public.slot_holds drop constraint if exists slot_holds_no_active_overlap;
alter table public.slot_holds add constraint slot_holds_no_active_overlap exclude using gist (barber_profile_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where (status='active');
create index if not exists idx_slot_holds_expiry on public.slot_holds (status,expires_at);

create table if not exists public.formsubmit_deliveries (
  id uuid primary key default gen_random_uuid(),appointment_id uuid not null references public.appointments(id) on delete cascade,recipient_email citext not null,subject text not null,status text not null default 'queued' check (status in ('queued','awaiting_activation','processing','sent','failed','retrying','disabled')),attempt_count integer not null default 0,response_status integer,sanitized_response jsonb not null default '{}'::jsonb,last_error text,next_attempt_at timestamptz,sent_at timestamptz,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create unique index if not exists formsubmit_appointment_unique on public.formsubmit_deliveries (appointment_id);
create index if not exists idx_formsubmit_retry on public.formsubmit_deliveries (status,next_attempt_at);

alter table public.queue_entries add column if not exists appointment_id uuid references public.appointments(id) on delete set null;
create index if not exists idx_queue_appointment on public.queue_entries (appointment_id) where appointment_id is not null;

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),business_id uuid references public.businesses(id) on delete cascade,appointment_id uuid references public.appointments(id) on delete set null,anonymous_session_id uuid,event_name text not null check (event_name in ('booking_page_viewed','qr_booking_page_viewed','service_selected','barber_selected','first_available_selected','date_selected','time_selected','booking_started','booking_step_completed','booking_abandoned','booking_submitted','booking_confirmed','booking_failed','availability_conflict','call_action','directions_action','rebook_action')),step integer check (step is null or step between 0 and 10),source text,campaign_source text,campaign_medium text,campaign_name text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default timezone('utc',now())
);
create index if not exists idx_booking_events_business_created on public.booking_events (business_id,created_at desc);
create index if not exists idx_booking_events_name_created on public.booking_events (event_name,created_at desc);

create or replace function public.appointment_transition_allowed(current_status text,next_status text) returns boolean language sql immutable as $$
select case current_status when 'draft' then next_status in ('slot_held','pending_confirmation','confirmed','failed','expired') when 'slot_held' then next_status in ('pending_confirmation','confirmed','expired','failed') when 'pending_confirmation' then next_status in ('confirmed','declined','expired','failed') when 'confirmed' then next_status in ('checked_in','rescheduled','cancelled_by_client','cancelled_by_business','no_show') when 'checked_in' then next_status in ('assigned','in_service','cancelled_by_business','no_show') when 'assigned' then next_status in ('in_service','cancelled_by_business','no_show') when 'in_service' then next_status in ('completed','cancelled_by_business') when 'rescheduled' then next_status in ('confirmed','cancelled_by_client','cancelled_by_business','no_show') else false end;
$$;
create or replace function public.validate_appointment_status_transition() returns trigger language plpgsql security invoker set search_path=public as $$
begin if old.status is distinct from new.status and not public.appointment_transition_allowed(old.status,new.status) then raise exception 'INVALID_APPOINTMENT_STATUS_TRANSITION' using errcode='22023'; end if; return new; end;
$$;
drop trigger if exists appointments_validate_status on public.appointments;
create trigger appointments_validate_status before update of status on public.appointments for each row execute function public.validate_appointment_status_transition();

drop trigger if exists clients_updated_at on public.clients; create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists appointments_updated_at on public.appointments; create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
drop trigger if exists barber_time_off_updated_at on public.barber_time_off; create trigger barber_time_off_updated_at before update on public.barber_time_off for each row execute function public.set_updated_at();
drop trigger if exists formsubmit_deliveries_updated_at on public.formsubmit_deliveries; create trigger formsubmit_deliveries_updated_at before update on public.formsubmit_deliveries for each row execute function public.set_updated_at();

create or replace function public.create_appointment_atomic(p_data jsonb) returns public.appointments language plpgsql security definer set search_path=public as $$
declare created public.appointments; existing public.appointments; selected_barber public.barber_profiles; selected_service public.services; lock_key bigint; requested_start timestamptz:=(p_data->>'starts_at')::timestamptz; requested_end timestamptz:=(p_data->>'ends_at')::timestamptz;
begin
  select * into existing from public.appointments where idempotency_key=(p_data->>'idempotency_key')::uuid; if found then return existing; end if;
  if requested_end<=requested_start then raise exception 'INVALID_APPOINTMENT_RANGE' using errcode='22023'; end if;
  select * into selected_service from public.services where id=(p_data->>'service_id')::uuid and active and bookable; if not found then raise exception 'SERVICE_NOT_BOOKABLE' using errcode='22023'; end if;
  select * into selected_barber from public.barber_profiles where id=(p_data->>'barber_profile_id')::uuid and active and status='published'; if not found then raise exception 'BARBER_NOT_BOOKABLE' using errcode='22023'; end if;
  if not exists (select 1 from public.barber_profile_services bps where bps.barber_profile_id=selected_barber.id and bps.service_id=selected_service.id and bps.active) then raise exception 'BARBER_SERVICE_NOT_ELIGIBLE' using errcode='22023'; end if;
  lock_key:=hashtextextended(selected_barber.id::text||requested_start::text,0); perform pg_advisory_xact_lock(lock_key);
  update public.slot_holds set status='expired' where status='active' and expires_at<=timezone('utc',now());
  if exists (select 1 from public.appointments a where a.barber_profile_id=selected_barber.id and a.status in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service') and tstzrange(a.starts_at,a.ends_at,'[)')&&tstzrange(requested_start,requested_end,'[)')) then raise exception 'SLOT_CONFLICT' using errcode='23P01'; end if;
  insert into public.appointments (business_id,location_id,client_id,auth_user_id,service_id,barber_profile_id,assigned_staff_user_id,public_reference,manage_token_hash,square_booking_id,square_customer_id,square_order_id,service_name_snapshot,service_price_snapshot_cents,service_duration_snapshot_minutes,addon_snapshot,barber_name_snapshot,client_name_snapshot,client_email_snapshot,client_phone_snapshot,starts_at,ends_at,timezone,status,booking_source,campaign_source,campaign_medium,campaign_name,referral_source,deposit_required_cents,deposit_status,client_notes,policy_version,policy_accepted_at,email_consent,sms_consent,idempotency_key,formsubmit_status,client_confirmation_status,barber_notification_status,sync_status,created_by)
  values ((p_data->>'business_id')::uuid,(p_data->>'location_id')::uuid,(p_data->>'client_id')::uuid,nullif(p_data->>'auth_user_id','')::uuid,selected_service.id,selected_barber.id,selected_barber.staff_user_id,p_data->>'public_reference',p_data->>'manage_token_hash',nullif(p_data->>'square_booking_id',''),nullif(p_data->>'square_customer_id',''),nullif(p_data->>'square_order_id',''),p_data->>'service_name_snapshot',(p_data->>'service_price_snapshot_cents')::integer,(p_data->>'service_duration_snapshot_minutes')::integer,coalesce(p_data->'addon_snapshot','[]'::jsonb),p_data->>'barber_name_snapshot',p_data->>'client_name_snapshot',nullif(p_data->>'client_email_snapshot','')::citext,nullif(p_data->>'client_phone_snapshot',''),requested_start,requested_end,coalesce(nullif(p_data->>'timezone',''),'America/New_York'),coalesce(nullif(p_data->>'status',''),'confirmed'),coalesce(nullif(p_data->>'booking_source',''),'website'),nullif(p_data->>'campaign_source',''),nullif(p_data->>'campaign_medium',''),nullif(p_data->>'campaign_name',''),nullif(p_data->>'referral_source',''),coalesce((p_data->>'deposit_required_cents')::integer,0),coalesce(nullif(p_data->>'deposit_status',''),'not_required'),nullif(p_data->>'client_notes',''),p_data->>'policy_version',(p_data->>'policy_accepted_at')::timestamptz,coalesce((p_data->>'email_consent')::boolean,true),coalesce((p_data->>'sms_consent')::boolean,false),(p_data->>'idempotency_key')::uuid,coalesce(nullif(p_data->>'formsubmit_status',''),'queued'),'queued',case when selected_barber.staff_user_id is null then 'suppressed' else 'queued' end,coalesce(nullif(p_data->>'sync_status',''),'supabase_primary'),nullif(p_data->>'created_by','')::uuid) returning * into created;
  insert into public.appointment_assignments (appointment_id,barber_profile_id,assigned_staff_user_id,assignment_source,reason,assigned_by) values (created.id,created.barber_profile_id,created.assigned_staff_user_id,case when coalesce((p_data->>'first_available')::boolean,false) then 'first_available' else 'booking' end,'Selected during booking',created.created_by);
  insert into public.appointment_status_history (booking_metadata_id,appointment_id,from_status,to_status,changed_by,reason,metadata) values (null,created.id,null,created.status,created.created_by,'Appointment created',jsonb_build_object('source',created.booking_source));
  insert into public.audit_logs (business_id,actor_user_id,actor_role,action,resource_type,resource_id,reason,after_data,metadata) values (created.business_id,created.created_by,case when created.created_by is null then 'public' else 'authenticated' end,'booking.created','appointment',created.id::text,'Atomic booking creation',to_jsonb(created),jsonb_build_object('correlation_id',created.idempotency_key,'reference',created.public_reference));
  return created;
exception when exclusion_violation then raise exception 'SLOT_CONFLICT' using errcode='23P01';
end;
$$;
revoke all on function public.create_appointment_atomic(jsonb) from public,anon,authenticated;
grant execute on function public.create_appointment_atomic(jsonb) to service_role;

alter table public.clients enable row level security;
alter table public.barber_profile_services enable row level security;
alter table public.barber_time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_addons enable row level security;
alter table public.appointment_assignments enable row level security;
alter table public.slot_holds enable row level security;
alter table public.formsubmit_deliveries enable row level security;
alter table public.booking_events enable row level security;

create policy clients_self_read on public.clients for select using (auth_user_id=auth.uid() or public.can_operate_business(business_id));
create policy clients_staff_manage on public.clients for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
create policy barber_profile_services_public_read on public.barber_profile_services for select using (active and exists (select 1 from public.barber_profiles bp where bp.id=barber_profile_id and bp.active and bp.status='published'));
create policy barber_profile_services_staff_manage on public.barber_profile_services for all using (exists (select 1 from public.barber_profiles bp where bp.id=barber_profile_id and public.can_manage_business(bp.business_id))) with check (exists (select 1 from public.barber_profiles bp where bp.id=barber_profile_id and public.can_manage_business(bp.business_id)));
create policy barber_time_off_self_read on public.barber_time_off for select using (exists (select 1 from public.barber_profiles bp where bp.id=barber_profile_id and (bp.staff_user_id=auth.uid() or public.can_operate_business(bp.business_id))));
create policy barber_time_off_manage on public.barber_time_off for all using (exists (select 1 from public.barber_profiles bp where bp.id=barber_profile_id and public.can_manage_business(bp.business_id))) with check (exists (select 1 from public.barber_profiles bp where bp.id=barber_profile_id and public.can_manage_business(bp.business_id)));
create policy appointments_client_read on public.appointments for select using (auth_user_id=auth.uid() or exists (select 1 from public.clients c where c.id=client_id and c.auth_user_id=auth.uid()));
create policy appointments_barber_read on public.appointments for select using (assigned_staff_user_id=auth.uid());
create policy appointments_staff_manage on public.appointments for all using (public.can_operate_business(business_id)) with check (public.can_operate_business(business_id));
create policy appointment_addons_access on public.appointment_addons for select using (exists (select 1 from public.appointments a where a.id=appointment_id));
create policy appointment_addons_staff_manage on public.appointment_addons for all using (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id))) with check (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)));
create policy appointment_assignments_access on public.appointment_assignments for select using (exists (select 1 from public.appointments a where a.id=appointment_id));
create policy appointment_assignments_staff_manage on public.appointment_assignments for all using (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id))) with check (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)));
create policy formsubmit_deliveries_staff_read on public.formsubmit_deliveries for select using (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)));
create policy formsubmit_deliveries_admin_manage on public.formsubmit_deliveries for all using (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_manage_business(a.business_id))) with check (exists (select 1 from public.appointments a where a.id=appointment_id and public.can_manage_business(a.business_id)));

commit;
