-- ============================================================================
-- 202608220027_full_prepayment_service_fee.sql
-- ALREADY APPLIED to production 2026-08-22. Reproduced for repo history.
-- ============================================================================

-- 1. Full prepayment: the amount collected at booking is now the entire
--    service price. The existing deposit gate already blocks confirmation
--    until this is paid, so no new gating logic was required.
update public.services
set deposit_cents = price_cents
where active and deposit_cents <> price_cents;

-- 2. The 4% service fee is SHOP revenue, not service revenue. It must be
--    excluded from the commission basis, otherwise barbers would earn 70%
--    of the shop's own fee.
alter table public.square_orders
  add column if not exists service_charge_cents integer not null default 0;

comment on column public.square_orders.service_charge_cents is
  'Total Square service charges on the order (e.g. the 4% service fee). Excluded from the commission basis.';

update public.square_orders o
set service_charge_cents = coalesce((
  select sum((sc->'total_money'->>'amount')::int)
  from jsonb_array_elements(o.raw->'service_charges') sc
), 0)
where o.raw ? 'service_charges' and o.service_charge_cents = 0;
