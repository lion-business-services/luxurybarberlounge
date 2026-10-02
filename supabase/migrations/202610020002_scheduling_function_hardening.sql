-- Scheduling function hardening (follow-up to 202610020001).
--
-- The Supabase security advisor flagged the helpers added by the scheduling
-- migration:
--   * four pure helper functions had no pinned search_path,
--   * the realtime broadcast trigger function kept the default EXECUTE grant.
--
-- This migration only tightens settings. It changes no table, no row and no
-- function body, and it is safe to run more than once.
begin;

alter function public.booking_hold_minutes() set search_path = public;
alter function public.appointment_is_blocking(text, text, timestamptz, timestamptz) set search_path = public;
alter function public.barber_calendar_lock_key(uuid) set search_path = public;
alter function public.appointment_transition_allowed(text, text) set search_path = public;

-- A trigger function is run by its trigger, never called directly. Triggers
-- keep firing for every role without this grant.
revoke all on function public.broadcast_booking_availability_change() from public, anon, authenticated;

commit;
