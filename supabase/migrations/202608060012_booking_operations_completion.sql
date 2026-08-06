-- Complete appointment operations, client visibility, queue linkage, and safe rescheduling.
begin;

create index if not exists idx_appointment_status_history_appointment on public.appointment_status_history (appointment_id,created_at desc) where appointment_id is not null;
create index if not exists idx_appointment_notes_appointment on public.appointment_notes (appointment_id,created_at desc) where appointment_id is not null;
create index if not exists idx_appointment_reference_images_appointment on public.appointment_reference_images (appointment_id,created_at desc) where appointment_id is not null;
create unique index if not exists queue_entries_one_active_appointment on public.queue_entries (appointment_id)
  where appointment_id is not null and status in ('waiting','confirmed','checked_in','assigned','called','ready','in_service');

alter table public.appointment_status_history enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.appointment_reference_images enable row level security;

drop policy if exists appointment_addons_access on public.appointment_addons;
create policy appointment_addons_secure_read on public.appointment_addons for select
using (exists (select 1 from public.appointments a where a.id=appointment_id and (a.auth_user_id=auth.uid() or a.assigned_staff_user_id=auth.uid() or public.can_operate_business(a.business_id) or exists (select 1 from public.clients c where c.id=a.client_id and c.auth_user_id=auth.uid()))));
drop policy if exists appointment_assignments_access on public.appointment_assignments;
create policy appointment_assignments_secure_read on public.appointment_assignments for select
using (exists (select 1 from public.appointments a where a.id=appointment_id and (a.auth_user_id=auth.uid() or a.assigned_staff_user_id=auth.uid() or public.can_operate_business(a.business_id) or exists (select 1 from public.clients c where c.id=a.client_id and c.auth_user_id=auth.uid()))));

create policy appointment_status_history_new_appointment_read on public.appointment_status_history for select
using (
  appointment_id is not null and exists (
    select 1 from public.appointments a where a.id=appointment_id and (
      a.auth_user_id=auth.uid()
      or a.assigned_staff_user_id=auth.uid()
      or public.can_operate_business(a.business_id)
    )
  )
);
create policy appointment_status_history_new_appointment_manage on public.appointment_status_history for all
using (appointment_id is not null and exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)))
with check (appointment_id is not null and exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)));

create policy appointment_notes_new_appointment_read on public.appointment_notes for select
using (
  appointment_id is not null and exists (
    select 1 from public.appointments a where a.id=appointment_id and (
      public.can_operate_business(a.business_id)
      or a.assigned_staff_user_id=auth.uid()
      or ((a.auth_user_id=auth.uid() or exists (select 1 from public.clients c where c.id=a.client_id and c.auth_user_id=auth.uid())) and client_visible)
    )
  )
);
create policy appointment_notes_new_appointment_manage on public.appointment_notes for all
using (appointment_id is not null and exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)))
with check (appointment_id is not null and exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)));

create policy appointment_reference_images_new_appointment_read on public.appointment_reference_images for select
using (
  appointment_id is not null and status='active' and exists (
    select 1 from public.appointments a where a.id=appointment_id and (
      a.auth_user_id=auth.uid()
      or a.assigned_staff_user_id=auth.uid()
      or public.can_operate_business(a.business_id)
    )
  )
);
create policy appointment_reference_images_new_appointment_manage on public.appointment_reference_images for all
using (appointment_id is not null and exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)))
with check (appointment_id is not null and exists (select 1 from public.appointments a where a.id=appointment_id and public.can_operate_business(a.business_id)));

create or replace function public.reschedule_appointment_atomic(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_actor uuid,
  p_actor_role text,
  p_reason text
) returns public.appointments
language plpgsql security definer set search_path=public as $$
declare current_row public.appointments; updated_row public.appointments; lock_key bigint;
begin
  select * into current_row from public.appointments where id=p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode='P0002'; end if;
  if current_row.status not in ('confirmed','rescheduled') then raise exception 'APPOINTMENT_NOT_RESCHEDULABLE' using errcode='22023'; end if;
  if p_ends_at<=p_starts_at then raise exception 'INVALID_APPOINTMENT_RANGE' using errcode='22023'; end if;
  lock_key:=hashtextextended(current_row.barber_profile_id::text||p_starts_at::text,0);
  perform pg_advisory_xact_lock(lock_key);
  update public.appointments set status='rescheduled',starts_at=p_starts_at,ends_at=p_ends_at where id=p_appointment_id returning * into updated_row;
  update public.appointments set status='confirmed' where id=p_appointment_id returning * into updated_row;
  insert into public.appointment_status_history (appointment_id,from_status,to_status,changed_by,reason,metadata)
  values (p_appointment_id,current_row.status,'confirmed',p_actor,coalesce(nullif(p_reason,''),'Appointment rescheduled'),jsonb_build_object('previous_starts_at',current_row.starts_at,'starts_at',p_starts_at,'source',p_actor_role));
  insert into public.audit_logs (business_id,actor_user_id,actor_role,action,resource_type,resource_id,reason,before_data,after_data,metadata)
  values (current_row.business_id,p_actor,p_actor_role,'booking.rescheduled','appointment',p_appointment_id::text,coalesce(nullif(p_reason,''),'Appointment rescheduled'),to_jsonb(current_row),to_jsonb(updated_row),jsonb_build_object('reference',current_row.public_reference));
  return updated_row;
exception when exclusion_violation then raise exception 'SLOT_CONFLICT' using errcode='23P01';
end;
$$;
revoke all on function public.reschedule_appointment_atomic(uuid,timestamptz,timestamptz,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reschedule_appointment_atomic(uuid,timestamptz,timestamptz,uuid,text,text) to service_role;

commit;
