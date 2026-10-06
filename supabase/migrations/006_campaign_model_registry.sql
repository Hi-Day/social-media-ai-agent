-- Campaign planning, content packages, model registry and cost estimation.
-- Model identities remain behind the application model registry; users only see codenames.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  objective text not null,
  audience text,
  platforms jsonb not null default '[]'::jsonb,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'planning',
  budget_credits numeric(12,2),
  selected_package text,
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_status_check check (status in ('planning','planned','active','paused','completed','cancelled'))
);

create table if not exists public.content_packages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  content_plan jsonb not null default '[]'::jsonb,
  model_policy jsonb not null default '{}'::jsonb,
  estimated_credits numeric(12,2) not null default 0,
  estimated_duration_minutes integer not null default 0,
  recommended boolean not null default false,
  created_at timestamptz not null default now(),
  unique (campaign_id, code)
);

create table if not exists public.model_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  capability text not null,
  codename text not null,
  positioning text not null,
  speed_tier integer not null default 3 check (speed_tier between 1 and 5),
  quality_tier integer not null default 3 check (quality_tier between 1 and 5),
  cost_credits numeric(12,4) not null default 1,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, capability, codename)
);

create index if not exists idx_campaigns_workspace_status on public.campaigns(workspace_id,status);
create index if not exists idx_content_packages_campaign on public.content_packages(campaign_id);
create index if not exists idx_model_profiles_workspace_capability on public.model_profiles(workspace_id,capability);

alter table public.campaigns enable row level security;
alter table public.content_packages enable row level security;
alter table public.model_profiles enable row level security;

grant select, insert, update, delete on public.campaigns, public.content_packages, public.model_profiles to authenticated;

create policy "members can read campaigns" on public.campaigns for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy "members can create campaigns" on public.campaigns for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));
create policy "members can update campaigns" on public.campaigns for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));
create policy "members can delete campaigns" on public.campaigns for delete to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read content packages" on public.content_packages for select to authenticated
using ((select private.is_workspace_member(workspace_id)));
create policy "members can create content packages" on public.content_packages for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));
create policy "members can update content packages" on public.content_packages for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));
create policy "members can delete content packages" on public.content_packages for delete to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read model profiles" on public.model_profiles for select to authenticated
using (workspace_id is null or (select private.is_workspace_member(workspace_id)));
create policy "admins can manage workspace model profiles" on public.model_profiles for all to authenticated
using (workspace_id is not null and exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = model_profiles.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin')
))
with check (workspace_id is not null and exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = model_profiles.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin')
));
