begin;

-- ============================================================
-- Luxury Barber Lounge
-- Privacy-safe realtime queue invalidation
--
-- This migration deliberately broadcasts only a change signal.
-- It NEVER broadcasts queue row data, client names, phone
-- numbers, notes, appointment data, or other private fields.
--
-- The public TV display receives the signal, then reloads the
-- already privacy-filtered /api/queue/display endpoint.
-- ============================================================

create or replace function public.broadcast_queue_display_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'changedAt', timezone('utc', now()),
      'source', TG_TABLE_NAME,
      'operation', TG_OP
    ),
    'queue_changed',
    'queue-display:northfield',
    false
  );

  return null;
exception
  when others then
    -- A Realtime delivery problem must NEVER break the actual
    -- queue transaction. The polling fallback will recover.
    raise warning
      'Queue realtime broadcast failed for %.%: %',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      sqlerrm;

    return null;
end;
$$;

-- Queue position, status, wait time, consent label, and other
-- operational queue changes.
drop trigger if exists queue_entries_realtime_display
  on public.queue_entries;

create trigger queue_entries_realtime_display
after insert or update or delete
on public.queue_entries
for each row
execute function public.broadcast_queue_display_change();

-- Assignment changes can alter which barber is shown even when
-- the queue-entry status itself has not materially changed.
drop trigger if exists queue_assignments_realtime_display
  on public.queue_assignments;

create trigger queue_assignments_realtime_display
after insert or update or delete
on public.queue_assignments
for each row
execute function public.broadcast_queue_display_change();

-- Barber operational availability can affect Who's Next and the
-- information eventually rendered on the shop display.
drop trigger if exists barber_profiles_realtime_display
  on public.barber_profiles;

create trigger barber_profiles_realtime_display
after update of
  active,
  status,
  accepting_walk_ins,
  availability_status,
  display_name
on public.barber_profiles
for each row
execute function public.broadcast_queue_display_change();

comment on function public.broadcast_queue_display_change()
is
'Broadcasts a privacy-safe queue_changed invalidation signal to the public Northfield queue-display Realtime topic. No client or queue row data is included.';

commit;