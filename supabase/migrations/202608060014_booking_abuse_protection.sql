-- Durable booking abuse protection for serverless deployments.

begin;

create table if not exists public.request_rate_limits (
  bucket_key text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  resets_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.request_rate_limits to service_role;

create index if not exists idx_request_rate_limits_expiry
  on public.request_rate_limits (resets_at);

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.request_rate_limits;
  now_utc timestamptz := timezone('utc', now());
begin
  if length(coalesce(p_key, '')) < 16 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT_INPUT';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_key));
  select * into current_row from public.request_rate_limits where bucket_key = p_key for update;

  if current_row.bucket_key is null or current_row.resets_at <= now_utc then
    insert into public.request_rate_limits (bucket_key, request_count, resets_at, updated_at)
    values (p_key, 1, now_utc + make_interval(secs => p_window_seconds), now_utc)
    on conflict (bucket_key) do update
      set request_count = 1,
          resets_at = excluded.resets_at,
          updated_at = excluded.updated_at
    returning * into current_row;
  else
    update public.request_rate_limits
    set request_count = request_count + 1,
        updated_at = now_utc
    where bucket_key = p_key
    returning * into current_row;
  end if;

  delete from public.request_rate_limits
  where resets_at < now_utc - interval '1 day';

  return jsonb_build_object(
    'allowed', current_row.request_count <= p_limit,
    'remaining', greatest(0, p_limit - current_row.request_count),
    'retry_after_seconds', greatest(1, ceil(extract(epoch from (current_row.resets_at - now_utc))))
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

commit;
