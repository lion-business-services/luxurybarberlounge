create or replace function public.enforce_walk_in_payment_before_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and new.appointment_id is null then
    if not exists (
      select 1
      from public.walk_in_payments p
      where p.queue_entry_id = new.id
        and p.business_id = new.business_id
        and p.status = 'paid'
    ) then
      raise exception 'WALK_IN_PAYMENT_REQUIRED'
        using errcode = 'P0001',
              detail = 'A walk-in must have a paid payment record before it can be completed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists queue_entries_require_paid_walkin_completion on public.queue_entries;

create trigger queue_entries_require_paid_walkin_completion
before insert or update of status on public.queue_entries
for each row
execute function public.enforce_walk_in_payment_before_completion();
