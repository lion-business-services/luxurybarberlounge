create or replace function public.force_full_prepayment_service_price()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(new.active, false) and coalesce(new.bookable, false) and new.price_cents is not null then
    new.deposit_cents := new.price_cents;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_force_full_prepayment_service_price on public.services;
create trigger trg_force_full_prepayment_service_price
before insert or update of price_cents, deposit_cents, active, bookable
on public.services
for each row
execute function public.force_full_prepayment_service_price();

update public.services
set deposit_cents = price_cents
where active = true
  and bookable = true
  and deposit_cents is distinct from price_cents;

create or replace function public.enforce_website_full_prepayment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  paid_principal_cents integer := 0;
  must_validate boolean := false;
begin
  if new.booking_source = 'website' and coalesce(new.service_price_snapshot_cents, 0) > 0 then
    new.deposit_required_cents := new.service_price_snapshot_cents;

    if tg_op = 'INSERT' then
      must_validate := new.status = 'confirmed' or new.deposit_status = 'paid';
    else
      must_validate :=
        (new.status = 'confirmed' and old.status is distinct from 'confirmed')
        or (new.deposit_status = 'paid' and old.deposit_status is distinct from 'paid');
    end if;

    if must_validate then
      select coalesce(sum(l.amount_cents), 0)::integer
        into paid_principal_cents
      from public.appointment_payment_links l
      where l.appointment_id = new.id
        and l.status = 'paid'
        and l.purpose in ('deposit', 'balance');

      if paid_principal_cents < new.service_price_snapshot_cents then
        if new.status = 'confirmed' then
          new.status := 'pending_confirmation';
        end if;
        if new.deposit_status = 'paid' then
          new.deposit_status := 'pending';
        end if;
      elsif new.status = 'confirmed' then
        new.deposit_status := 'paid';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_website_full_prepayment on public.appointments;
create trigger trg_enforce_website_full_prepayment
before insert or update of booking_source, service_price_snapshot_cents, deposit_required_cents, deposit_status, status
on public.appointments
for each row
execute function public.enforce_website_full_prepayment();
