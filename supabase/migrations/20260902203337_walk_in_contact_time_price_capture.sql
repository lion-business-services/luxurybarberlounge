alter table public.queue_entries
  add column if not exists client_email text,
  add column if not exists service_price_snapshot_cents integer,
  add column if not exists walk_in_at timestamptz;

update public.queue_entries qe
set service_price_snapshot_cents = s.price_cents
from public.services s
where qe.service_id = s.id
  and qe.service_price_snapshot_cents is null;

update public.queue_entries
set walk_in_at = coalesce(joined_at, created_at, timezone('utc', now()))
where walk_in_at is null;

alter table public.queue_entries
  alter column walk_in_at set default timezone('utc', now()),
  alter column walk_in_at set not null;

alter table public.queue_entries
  drop constraint if exists queue_entries_service_price_snapshot_nonnegative;

alter table public.queue_entries
  add constraint queue_entries_service_price_snapshot_nonnegative
  check (service_price_snapshot_cents is null or service_price_snapshot_cents >= 0);

create index if not exists idx_queue_entries_walk_in_at
  on public.queue_entries(location_id, walk_in_at desc);
