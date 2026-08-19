-- ============================================================================
-- 202608190022_balance_payment_token.sql
-- ALREADY APPLIED to production 2026-08-19. Reproduced for repo history.
-- ============================================================================

-- Single-purpose token for the "Pay balance now" link in the confirmation
-- email. Kept in its own column so issuing it can never invalidate the
-- manage token the client already holds in their browser URL.
alter table public.appointments
  add column if not exists balance_token_hash text;

comment on column public.appointments.balance_token_hash is
  'SHA-256 of the single-purpose balance payment token emailed after deposit settlement. Independent of manage_token_hash.';
