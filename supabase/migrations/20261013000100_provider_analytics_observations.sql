create table if not exists public.provider_analytics_observations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('linkedin')),
  provider_account_id text not null,
  provider_post_id text not null,
  metric_key text not null check (metric_key in ('likes','comments')),
  metric_value numeric(18,4) not null check (metric_value >= 0),
  observed_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  provider_api_version text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id, provider_post_id, metric_key, observed_at)
);

create index if not exists idx_provider_analytics_workspace_observed
  on public.provider_analytics_observations(workspace_id, observed_at desc);
create index if not exists idx_provider_analytics_post
  on public.provider_analytics_observations(workspace_id, provider, provider_post_id, observed_at desc);

alter table public.provider_analytics_observations enable row level security;
revoke all on public.provider_analytics_observations from anon, authenticated;
grant select on public.provider_analytics_observations to authenticated;
grant all on public.provider_analytics_observations to service_role;

create policy "members can read provider analytics observations"
  on public.provider_analytics_observations for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
