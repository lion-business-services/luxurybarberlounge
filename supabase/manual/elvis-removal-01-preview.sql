-- ============================================================================
-- STEP 1 of 2: DRY RUN PREVIEW (read only, changes nothing)
-- Where to run: Supabase Dashboard > SQL Editor > New query > paste > Run
--
-- Shows every record tied to Elvis before he is archived.
-- If section 2 or 3 returns rows, reassign or cancel those bookings in the
-- admin portal first. Step 2 will refuse to run while they exist.
-- ============================================================================

-- 1. Elvis's barber profile
select bp.id, bp.slug, bp.display_name, bp.active, bp.status, bp.featured,
       bp.staff_user_id, bp.portal_email, bp.square_team_member_id
from public.barber_profiles bp
join public.businesses b on b.id = bp.business_id
where b.slug = 'luxury-barber-lounge' and bp.slug = 'elvis';

-- 2. Upcoming appointments still booked with Elvis (must be empty before step 2)
select a.id, a.public_reference, a.starts_at, a.status, a.barber_name_snapshot
from public.appointments a
join public.barber_profiles bp on bp.id = a.barber_profile_id
join public.businesses b on b.id = bp.business_id
where b.slug = 'luxury-barber-lounge' and bp.slug = 'elvis'
  and a.starts_at >= timezone('utc', now())
  and a.status in ('slot_held','pending_confirmation','confirmed','checked_in','assigned','in_service')
order by a.starts_at;

-- 3. Walk-in queue entries currently assigned to Elvis (must be empty before step 2)
select qe.id, qe.client_name, qe.status, qa.assigned_at
from public.queue_assignments qa
join public.queue_entries qe on qe.id = qa.queue_entry_id
join public.barber_profiles bp on bp.staff_user_id = qa.barber_user_id
join public.businesses b on b.id = bp.business_id
where b.slug = 'luxury-barber-lounge' and bp.slug = 'elvis'
  and qa.active = true
  and qe.status in ('waiting','confirmed','checked_in','assigned','called','ready','in_service');

-- 4. Record counts step 2 will change (history rows are kept, never deleted)
with e as (
  select bp.id, bp.staff_user_id
  from public.barber_profiles bp
  join public.businesses b on b.id = bp.business_id
  where b.slug = 'luxury-barber-lounge' and bp.slug = 'elvis'
)
select 'past appointments kept as history' as item,
       (select count(*) from public.appointments a, e where a.barber_profile_id = e.id) as rows
union all select 'service eligibility rows to deactivate',
       (select count(*) from public.barber_profile_services s, e where s.barber_profile_id = e.id and s.active)
union all select 'weekly schedule rows to deactivate',
       (select count(*) from public.barber_schedules s, e where s.barber_profile_id = e.id and s.active)
union all select 'profile images to deactivate',
       (select count(*) from public.barber_images i, e where i.barber_profile_id = e.id and i.active)
union all select 'pending portal invitations to revoke',
       (select count(*) from public.user_invitations ui, e where (ui.barber_profile_id = e.id or lower(ui.email::text) = 'elvis29p@gmail.com') and ui.status = 'pending')
union all select 'Barber role grants to remove',
       (select count(*) from public.user_roles ur join public.roles r on r.id = ur.role_id, e where ur.user_id = e.staff_user_id and r.key = 'barber')
union all select 'clients with Elvis as preferred barber (preference cleared)',
       (select count(*) from public.clients c, e where c.preferred_barber_profile_id = e.id);
