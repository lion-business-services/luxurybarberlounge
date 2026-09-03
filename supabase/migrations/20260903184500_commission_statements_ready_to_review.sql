update public.settlement_statements
set status = 'review',
    published_at = coalesce(published_at, now())
where status = 'provisional';

update public.settlement_statements
set published_at = coalesce(published_at, now())
where status = 'review' and published_at is null;

create or replace function public.normalize_commission_statement_review_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'provisional' then
    new.status := 'review';
  end if;

  if new.status = 'review' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_commission_statement_review_status on public.settlement_statements;
create trigger trg_normalize_commission_statement_review_status
before insert or update of status, published_at on public.settlement_statements
for each row
execute function public.normalize_commission_statement_review_status();

alter table public.settlement_statements drop constraint if exists settlement_statements_status_check;
alter table public.settlement_statements
  add constraint settlement_statements_status_check
  check (status = any (array['review'::text, 'final'::text, 'paid'::text, 'voided'::text]));