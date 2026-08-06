-- Live booking catalog hardening
-- Placeholder identities must never appear as bookable production staff.

begin;

update public.barber_profiles
set active = false,
    status = 'archived',
    updated_at = timezone('utc', now())
where demo = true
  and staff_user_id is null;

-- Keep fast eligibility and schedule lookups aligned with the public booking engine.
create index if not exists idx_barber_profiles_live_booking
  on public.barber_profiles (business_id, active, demo, status, sort_order);

create index if not exists idx_barber_profile_services_live_booking
  on public.barber_profile_services (barber_profile_id, service_id)
  where active = true;

create index if not exists idx_barber_schedules_availability
  on public.barber_schedules (barber_profile_id, location_id, weekday, active);

commit;
