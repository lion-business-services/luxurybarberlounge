begin;

create or replace function public.enforce_verified_square_appointment_payment_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_source text;
  v_verified_amount bigint := 0;
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select a.booking_source
      into v_booking_source
    from public.appointments a
    where a.id = new.appointment_id;

    if v_booking_source in ('website', 'qr_business_card') then
      if new.square_order_id is null then
        raise exception 'SQUARE_PAYMENT_NOT_VERIFIED'
          using errcode = 'P0001',
                detail = 'Website appointment payment links require a verified Square order before they can be marked paid.';
      end if;

      select coalesce(sum(sp.amount_cents), 0)
        into v_verified_amount
      from public.square_payments sp
      where sp.business_id = new.business_id
        and sp.square_order_id = new.square_order_id
        and upper(coalesce(sp.status, '')) = 'COMPLETED'
        and upper(coalesce(sp.raw->>'source_type', '')) <> 'CASH';

      if v_verified_amount < coalesce(new.amount_cents, 0) then
        raise exception 'SQUARE_PAYMENT_NOT_VERIFIED'
          using errcode = 'P0001',
                detail = format(
                  'Verified non-cash Square amount %s is below required appointment principal %s.',
                  v_verified_amount,
                  coalesce(new.amount_cents, 0)
                );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointment_payment_links_require_verified_square on public.appointment_payment_links;

create trigger appointment_payment_links_require_verified_square
before insert or update of status on public.appointment_payment_links
for each row
execute function public.enforce_verified_square_appointment_payment_link();

commit;
