create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  initiated_by uuid not null references auth.users(id) on delete restrict,
  provider text not null check (provider = 'xendit'),
  plan_code text not null check (plan_code in ('starter','growth','agency')),
  amount_idr bigint not null check (amount_idr > 0),
  monthly_credit_limit numeric(12,4) not null check (monthly_credit_limit > 0 and monthly_credit_limit <= 1000000000),
  status text not null default 'pending' check (status in ('pending','active','past_due','inactive','failed')),
  provider_session_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  pending_expires_at timestamptz not null default (now() + interval '1 hour'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_workspace_subscriptions_one_open
  on public.workspace_subscriptions(workspace_id)
  where status in ('pending','active','past_due');
create unique index if not exists idx_workspace_subscriptions_provider_plan
  on public.workspace_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists idx_workspace_subscriptions_workspace_status
  on public.workspace_subscriptions(workspace_id, status, updated_at desc);

alter table public.workspace_subscriptions enable row level security;
revoke all on public.workspace_subscriptions from anon, authenticated;
grant select on public.workspace_subscriptions to authenticated;
grant all on public.workspace_subscriptions to service_role;

create policy "workspace admins can view subscriptions"
  on public.workspace_subscriptions for select to authenticated
  using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_subscriptions.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  ));

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'xendit'),
  event_id text not null,
  event_type text not null,
  reference_id text,
  provider_resource_id text,
  payload_sha256 text not null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','rejected','failed')),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

alter table public.billing_webhook_events enable row level security;
revoke all on public.billing_webhook_events from public, anon, authenticated;
grant all on public.billing_webhook_events to service_role;
