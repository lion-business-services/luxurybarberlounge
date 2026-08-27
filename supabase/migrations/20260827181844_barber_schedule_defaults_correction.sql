update public.barber_schedules bs
set effective_to = date '2026-08-26', updated_at = now()
from public.barber_profiles bp
where bs.barber_profile_id = bp.id
  and bp.slug = 'angelica-aquino'
  and bs.weekday = 3
  and bs.effective_from = date '2026-08-07'
  and bs.effective_to is null;

insert into public.barber_schedules
  (barber_profile_id, barber_user_id, location_id, weekday, starts_at, ends_at, active, effective_from)
select bp.id, bp.staff_user_id, l.id, d.weekday, time '08:00', time '21:00', true, date '2026-08-27'
from public.barber_profiles bp
join public.businesses b on b.id = bp.business_id and b.slug = 'luxury-barber-lounge'
join public.locations l on l.business_id = b.id and l.name = 'Northfield Lounge'
cross join (values (2),(3),(4),(5)) as d(weekday)
where bp.slug = 'ruben-diaz-jr'
  and not exists (
    select 1 from public.barber_schedules x
    where x.barber_profile_id = bp.id and x.location_id = l.id
      and x.weekday = d.weekday and x.effective_from = date '2026-08-27'
  );

insert into public.barber_schedules
  (barber_profile_id, barber_user_id, location_id, weekday, starts_at, ends_at, active, effective_from)
select bp.id, bp.staff_user_id, l.id, d.weekday, time '08:00', time '21:00', true, date '2026-08-27'
from public.barber_profiles bp
join public.businesses b on b.id = bp.business_id and b.slug = 'luxury-barber-lounge'
join public.locations l on l.business_id = b.id and l.name = 'Northfield Lounge'
cross join (values (2),(4),(5),(6)) as d(weekday)
where bp.slug = 'angelica-aquino'
  and not exists (
    select 1 from public.barber_schedules x
    where x.barber_profile_id = bp.id and x.location_id = l.id
      and x.weekday = d.weekday and x.effective_from = date '2026-08-27'
  );
