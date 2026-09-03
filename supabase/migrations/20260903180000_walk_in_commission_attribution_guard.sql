-- Defense in depth for walk-in commission attribution.
-- A walk-in may receive BARBER/100% treatment only when a barber-specific
-- verified attribution exists for the client. Merely having an existing shop
-- client record is never sufficient.

create or replace function public.guard_walk_in_commission_attribution()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_verified boolean := false;
  v_client record;
  v_rule record;
  v_basis_points integer;
  v_base_barber integer;
  v_barber_tips integer;
begin
  if new.attribution_type <> 'BARBER'
     or coalesce(new.metadata->>'source','') <> 'walk_in_payment' then
    return new;
  end if;

  if new.client_record_id is not null then
    select c.auth_user_id, lower(c.email) as email, c.phone
      into v_client
    from public.clients c
    where c.id = new.client_record_id;
  end if;

  select exists (
    select 1
    from public.client_barber_attributions a
    where a.business_id = new.business_id
      and a.barber_user_id = new.barber_user_id
      and a.attribution = 'BARBER'
      and a.effective_from <= now()
      and (
        (new.client_user_id is not null and a.client_user_id = new.client_user_id)
        or (v_client.auth_user_id is not null and a.client_user_id = v_client.auth_user_id)
        or (v_client.email is not null and lower(a.client_external_ref) = v_client.email)
        or (v_client.phone is not null and a.client_external_ref = v_client.phone)
      )
  ) into v_verified;

  if v_verified then
    return new;
  end if;

  select crv.*
    into v_rule
  from public.commission_rule_versions crv
  join public.commission_rules cr on cr.id = crv.rule_id
  where cr.business_id = new.business_id
    and cr.active = true
    and crv.attribution_type is null
    and crv.effective_from <= now()
    and (crv.effective_to is null or crv.effective_to > now())
    and (crv.location_id is null or crv.location_id = new.location_id)
    and (crv.barber_user_id is null or crv.barber_user_id = new.barber_user_id)
    and (crv.service_id is null or crv.service_id = new.service_id)
  order by crv.priority asc, crv.effective_from desc
  limit 1;

  if v_rule.id is null then
    raise exception 'ACTIVE_SHOP_COMMISSION_RULE_MISSING';
  end if;

  v_basis_points := greatest(0, least(10000, round(v_rule.barber_rate * 10000)::integer));
  v_base_barber := floor((new.eligible_basis_cents * v_basis_points + 5000)::numeric / 10000)::integer;
  v_barber_tips := case when v_rule.tips_to_barber then new.tip_cents else 0 end;

  new.attribution_type := 'SHOP';
  new.attribution_source := 'walk_in_unverified';
  new.attribution_evidence := coalesce(new.attribution_evidence, '{}'::jsonb) || jsonb_build_object(
    'databaseGuard', 'unverified_barber_relationship_downgraded',
    'guardedAt', now()
  );
  new.attribution_rule_version_id := null;
  new.commission_rule_version_id := v_rule.id;
  new.barber_rate := v_rule.barber_rate;
  new.shop_rate := v_rule.shop_rate;
  new.barber_amount_cents := greatest(0, v_base_barber + v_barber_tips);
  new.shop_amount_cents := greatest(
    0,
    new.eligible_basis_cents - v_base_barber
      + case when v_rule.tips_to_barber then 0 else new.tip_cents end
      + case when v_rule.include_taxes then new.tax_cents else 0 end
      - case when v_rule.include_processing_fees then new.processing_fee_cents else 0 end
  );
  new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
    'verifiedExistingClient', false,
    'attributionGuardApplied', true
  );

  return new;
end;
$$;

drop trigger if exists trg_guard_walk_in_commission_attribution on public.commission_calculations;
create trigger trg_guard_walk_in_commission_attribution
before insert or update of attribution_type, attribution_source, attribution_evidence, commission_rule_version_id, barber_rate, shop_rate, barber_amount_cents, shop_amount_cents, metadata
on public.commission_calculations
for each row
execute function public.guard_walk_in_commission_attribution();
