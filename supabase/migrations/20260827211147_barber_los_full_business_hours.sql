insert into public.barber_schedules (
  barber_profile_id,
  location_id,
  weekday,
  starts_at,
  ends_at,
  active,
  effective_from,
  effective_to
)
select
  bp.id,
  l.id,
  bh.weekday,
  bh.opens_at,
  bh.closes_at,
  true,
  date '2026-08-27',
  null
from public.barber_profiles bp
join public.businesses b on b.id=bp.business_id and b.slug='luxury-barber-lounge'
join public.locations l on l.business_id=b.id and l.slug='northfield' and l.active
join public.business_hours bh on bh.location_id=l.id
where bp.slug='barber-los'
  and bp.active
  and bh.closed=false
  and bh.opens_at is not null
  and bh.closes_at is not null
on conflict (barber_profile_id, location_id, weekday, effective_from)
do update set
  starts_at=excluded.starts_at,
  ends_at=excluded.ends_at,
  active=true,
  effective_to=null;

update public.barber_profiles bp
set availability_status='available',
    accepting_walk_ins=true,
    updated_at=now()
where bp.slug='barber-los'
  and bp.active;
