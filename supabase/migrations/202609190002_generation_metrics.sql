create table public.generation_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  operation text not null check(operation in ('analysis', 'comparison', 'question', 'scenario')),
  model text not null check(length(model) <= 200),
  input_characters integer not null check(input_characters >= 0),
  source_count integer not null check(source_count >= 0),
  output_characters integer not null check(output_characters >= 0),
  latency_ms integer not null check(latency_ms >= 0),
  retries integer not null check(retries between 0 and 1),
  cache_hit boolean not null,
  outcome text not null check(outcome in ('complete', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.generation_metrics enable row level security;
revoke all on public.generation_metrics from anon, authenticated;
grant insert on public.generation_metrics to service_role;
create index generation_metrics_created_at on public.generation_metrics(created_at desc);
