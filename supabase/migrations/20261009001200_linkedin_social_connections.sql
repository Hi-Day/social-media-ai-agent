create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('linkedin')),
  provider_account_id text not null,
  account_name text,
  encrypted_access_token text not null,
  token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  connected_by uuid not null references auth.users(id) on delete restrict,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id)
);
create index if not exists idx_social_connections_workspace_provider on public.social_connections(workspace_id, provider);
alter table public.social_connections enable row level security;
revoke all on public.social_connections from anon;
grant select, insert, update, delete on public.social_connections to authenticated;

create policy "workspace admins can view social connections" on public.social_connections for select to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = social_connections.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));
create policy "workspace admins can create social connections" on public.social_connections for insert to authenticated
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = social_connections.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin') and wm.user_id = social_connections.connected_by));
create policy "workspace admins can update social connections" on public.social_connections for update to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = social_connections.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')))
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = social_connections.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));
create policy "workspace admins can disconnect social accounts" on public.social_connections for delete to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = social_connections.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));
