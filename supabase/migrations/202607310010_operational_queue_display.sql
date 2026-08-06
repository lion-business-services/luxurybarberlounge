-- Luxury Barber Lounge: privacy-safe public queue display and simple barber availability.

begin;

alter table public.queue_entries
  add column if not exists public_display_consent boolean not null default false,
  add column if not exists public_display_label text;

alter table public.queue_entries drop constraint if exists queue_entries_public_display_label_check;
alter table public.queue_entries add constraint queue_entries_public_display_label_check
  check (public_display_label is null or char_length(public_display_label) between 1 and 40);

alter table public.barber_profiles
  add column if not exists accepting_walk_ins boolean not null default true,
  add column if not exists availability_status text not null default 'available';

alter table public.barber_profiles drop constraint if exists barber_profiles_availability_status_check;
alter table public.barber_profiles add constraint barber_profiles_availability_status_check
  check (availability_status in ('available','busy','break','off_duty','unavailable'));

create index if not exists idx_queue_public_display
  on public.queue_entries (location_id, status, manual_priority, joined_at)
  where status in ('waiting','confirmed','checked_in','assigned','called','ready','in_service');

create index if not exists idx_barber_walkin_availability
  on public.barber_profiles (business_id, active, accepting_walk_ins, availability_status);

insert into public.assignment_rule_versions (business_id, version, effective_from, status, rules, approved_at)
select b.id, 1, timezone('utc', now()), 'active',
  jsonb_build_object(
    'order', jsonb_build_array('due_appointment','manual_priority','check_in_time'),
    'barber_selection', jsonb_build_array('requested_barber','service_eligibility','lowest_projected_load'),
    'privacy', 'public_display_uses_token_unless_client_opted_in'
  ),
  timezone('utc', now())
from public.businesses b
where b.slug = 'luxury-barber-lounge'
  and not exists (
    select 1 from public.assignment_rule_versions arv
    where arv.business_id = b.id and arv.status = 'active'
  );

comment on column public.queue_entries.public_display_consent is 'Explicit opt-in to display a privacy-safe first name and last initial on the in-shop queue board.';
comment on column public.queue_entries.public_display_label is 'Privacy-safe label only. Never store phone, email, or full identity here.';

-- Locked commission policy v1.0 supplied by the owner: SHOP clients 70/30,
-- approved pre-existing BARBER clients 100/0, and tips 100% to the barber.
do $$
declare
  v_business uuid;
  v_commission_rule uuid;
  v_attribution_rule uuid;
begin
  select id into v_business from public.businesses where slug = 'luxury-barber-lounge' limit 1;
  if v_business is null then return; end if;

  select id into v_commission_rule from public.commission_rules
  where business_id = v_business and name = 'LBL Commission Policy v1.0' limit 1;
  if v_commission_rule is null then
    insert into public.commission_rules (business_id, name, description, active, current_version)
    values (v_business, 'LBL Commission Policy v1.0', 'Owner-approved 70/30 SHOP, 100% BARBER, tips to barber.', true, 1)
    returning id into v_commission_rule;
  else
    update public.commission_rules set active = true, current_version = 1 where id = v_commission_rule;
  end if;

  insert into public.commission_rule_versions (
    rule_id, version, effective_from, priority, barber_rate, shop_rate,
    tips_to_barber, include_product_revenue, include_membership_revenue,
    include_taxes, include_discounts, include_processing_fees,
    refund_treatment, config
  ) values (
    v_commission_rule, 1, timezone('utc', now()), 100, .70, .30,
    true, false, false, false, true, false,
    'separate_adjustment',
    jsonb_build_object(
      'policy_version', '1.0',
      'barber_attribution_rate', 1.0,
      'default_attribution', 'SHOP',
      'tips_outside_basis', true,
      'settlement_week', 'monday_sunday',
      'payout_method', 'manual_zelle_or_cash'
    )
  ) on conflict (rule_id, version) do nothing;

  select id into v_attribution_rule from public.attribution_rules
  where business_id = v_business and name = 'LBL Attribution Policy v1.0' limit 1;
  if v_attribution_rule is null then
    insert into public.attribution_rules (business_id, name, description, active, current_version)
    values (v_business, 'LBL Attribution Policy v1.0', 'Default SHOP unless a pre-existing barber relationship is approved.', true, 1)
    returning id into v_attribution_rule;
  else
    update public.attribution_rules set active = true, current_version = 1 where id = v_attribution_rule;
  end if;

  insert into public.attribution_rule_versions (
    rule_id, version, effective_from, priority, decision_config
  ) values (
    v_attribution_rule, 1, timezone('utc', now()), 100,
    jsonb_build_object(
      'default', 'SHOP',
      'walk_ins', 'SHOP',
      'barber_claim_window_hours', 24,
      'pre_existing_requires_approval', true,
      'claim_alert_threshold', 0.40
    )
  ) on conflict (rule_id, version) do nothing;
end $$;

commit;
