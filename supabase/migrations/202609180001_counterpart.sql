create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_data_size check (octet_length(data::text) <= 1000000)
);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;
grant select, insert, update, delete on public.reviews to service_role;
create policy own_reviews on public.reviews for select to authenticated
  using (owner_id = auth.uid());
create index reviews_owner_updated on public.reviews(owner_id, updated_at desc);

-- Admin-managed cap. The application may lower this cap but cannot raise it.
create table public.generation_settings (
  singleton boolean primary key default true check(singleton),
  daily_limit integer not null check(daily_limit between 1 and 10000)
);
insert into public.generation_settings values (true, 30);
alter table public.generation_settings enable row level security;
revoke all on public.generation_settings from anon, authenticated;

create table public.generation_operations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  cache_key text not null,
  kind text not null check(kind in ('analysis', 'followup')),
  state text not null default 'running' check(state in ('running','complete','failed')),
  started_at timestamptz not null default now(),
  result jsonb,
  unique(owner_id, review_id, cache_key)
);
alter table public.generation_operations enable row level security;
create policy read_own_operations on public.generation_operations for select to authenticated
  using(owner_id = auth.uid());
revoke insert, update, delete on public.generation_operations from anon, authenticated;

-- Retain admission counts when a review is deleted, so deletion cannot reset quotas.
create table public.generation_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('analysis','followup')),
  started_at timestamptz not null default now()
);
alter table public.generation_usage enable row level security;
revoke all on public.generation_usage from anon, authenticated;
create index generation_usage_day on public.generation_usage(started_at, owner_id, kind);

create table public.generation_leases (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  ticket uuid not null,
  expires_at timestamptz not null
);
alter table public.generation_leases enable row level security;
revoke all on public.generation_leases from anon, authenticated;

create function public.claim_generation(p_owner uuid, p_review uuid, p_key text, p_kind text, p_global_cap integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := p_owner;
  existing public.generation_operations;
  ticket uuid;
  cap integer;
  midnight timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.reviews where id=p_review and owner_id=actor) then
    raise exception 'NOT_FOUND';
  end if;
  if p_kind not in ('analysis','followup') or length(p_key) <> 64 then raise exception 'INVALID_INPUT'; end if;
  -- One lock serializes all admission checks, making both caps and active-call checks atomic.
  perform pg_advisory_xact_lock(9182026);
  select * into existing from public.generation_operations
    where owner_id=actor and review_id=p_review and cache_key=p_key;
  if existing.state = 'complete' then return jsonb_build_object('cached', true, 'result', existing.result); end if;
  if exists(select 1 from public.generation_leases where owner_id=actor
      and expires_at > now()) then raise exception 'GENERATION_BUSY'; end if;
  if (select count(*) from public.generation_usage where owner_id=actor and kind=p_kind
      and started_at >= midnight) >= (case when p_kind='analysis' then 3 else 10 end) then
    raise exception 'USER_QUOTA';
  end if;
  select least(daily_limit, greatest(1, coalesce(p_global_cap, 30))) into cap from public.generation_settings where singleton;
  if (select count(*) from public.generation_usage where started_at >= midnight) >= cap then
    raise exception 'GLOBAL_QUOTA';
  end if;
  if existing.id is not null then
    -- Failed attempts remain counted; an identical request may retry after the cooldown.
    if existing.started_at > now()-interval '2 minutes' then raise exception 'RETRY_LATER'; end if;
    update public.generation_operations set state='running', started_at=now(), result=null where id=existing.id returning id into ticket;
  else
    insert into public.generation_operations(owner_id,review_id,cache_key,kind)
      values(actor,p_review,p_key,p_kind) returning id into ticket;
  end if;
  insert into public.generation_usage(owner_id,kind) values(actor,p_kind);
  insert into public.generation_leases(owner_id,ticket,expires_at) values(actor,ticket,now()+interval '2 minutes')
    on conflict(owner_id) do update set ticket=excluded.ticket, expires_at=excluded.expires_at;
  return jsonb_build_object('cached', false, 'ticket', ticket);
end $$;

create function public.finish_generation(p_owner uuid, p_ticket uuid, p_result jsonb, p_failed boolean default false)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_owner is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.generation_operations set state=case when p_failed then 'failed' else 'complete' end,
    result=case when p_failed then null else p_result end
    where id=p_ticket and owner_id=p_owner and state='running';
  if not found then raise exception 'NOT_FOUND'; end if;
  delete from public.generation_leases where owner_id=p_owner and ticket=p_ticket;
end $$;
revoke all on function public.claim_generation(uuid,uuid,text,text,integer) from public, anon, authenticated;
revoke all on function public.finish_generation(uuid,uuid,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.claim_generation(uuid,uuid,text,text,integer) to service_role;
grant execute on function public.finish_generation(uuid,uuid,jsonb,boolean) to service_role;
