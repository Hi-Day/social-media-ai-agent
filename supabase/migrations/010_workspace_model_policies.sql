-- Workspace-level model routing policy.
-- The application registry remains authoritative for capability, codename and pricing.
-- Workspace policy only controls enabled tiers and the default tier for automatic routing.

create table if not exists public.workspace_model_policies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  capability text not null check (capability in ('text','image','video','voice','stt')),
  default_codename text not null,
  enabled_codenames jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, capability)
);

create index if not exists idx_workspace_model_policies_workspace
  on public.workspace_model_policies(workspace_id);

alter table public.workspace_model_policies enable row level security;

revoke all on public.workspace_model_policies from anon;
grant select, insert, update, delete on public.workspace_model_policies to authenticated;

create policy "members can read model policies"
on public.workspace_model_policies for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "admins can insert model policies"
on public.workspace_model_policies for insert
to authenticated
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_model_policies.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  )
);

create policy "admins can update model policies"
on public.workspace_model_policies for update
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_model_policies.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_model_policies.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  )
);

create policy "admins can delete model policies"
on public.workspace_model_policies for delete
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_model_policies.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  )
);

alter table public.workspace_model_policies
  add constraint workspace_model_policies_enabled_array_check
  check (jsonb_typeof(enabled_codenames) = 'array');
