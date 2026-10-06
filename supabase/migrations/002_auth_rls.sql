create schema if not exists private;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_workspace_members_user
  on public.workspace_members(user_id);

create index if not exists idx_workspace_members_workspace
  on public.workspace_members(workspace_id);

create or replace function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = 'owner'
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon, authenticated;
revoke all on function private.is_workspace_owner(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_owner(uuid) to authenticated;

create or replace function private.create_workspace(
  p_name text,
  p_brand_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'workspace_name_required';
  end if;

  insert into public.workspaces(name)
  values (trim(p_name))
  returning id into v_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  insert into public.brands(workspace_id, name)
  values (
    v_workspace_id,
    coalesce(nullif(trim(p_brand_name), ''), trim(p_name))
  );

  return v_workspace_id;
end;
$$;

revoke all on function private.create_workspace(text, text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.create_workspace(text, text) to authenticated;

alter table public.workspace_members enable row level security;
alter table public.workspaces enable row level security;
alter table public.brands enable row level security;
alter table public.content_drafts enable row level security;
alter table public.approvals enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.workspace_members, public.workspaces, public.brands,
  public.content_drafts, public.approvals, public.agent_tasks, public.audit_events
from anon, authenticated;

grant select on public.workspace_members to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.brands to authenticated;
grant select, insert, update, delete on public.content_drafts to authenticated;
grant select, insert, update, delete on public.approvals to authenticated;
grant select, insert, update, delete on public.agent_tasks to authenticated;
grant select on public.audit_events to authenticated;

create policy "members can read their memberships"
on public.workspace_members for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can create their own membership"
on public.workspace_members for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and role = 'owner'
);

create policy "members can view their workspaces"
on public.workspaces for select
to authenticated
using ((select private.is_workspace_member(id)));

create policy "authenticated users can create workspaces"
on public.workspaces for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy "owners can update workspaces"
on public.workspaces for update
to authenticated
using ((select private.is_workspace_owner(id)))
with check ((select private.is_workspace_owner(id)));

create policy "owners can delete workspaces"
on public.workspaces for delete
to authenticated
using ((select private.is_workspace_owner(id)));

create policy "members can read brands"
on public.brands for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create brands"
on public.brands for insert
to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update brands"
on public.brands for update
to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete brands"
on public.brands for delete
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read drafts"
on public.content_drafts for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create drafts"
on public.content_drafts for insert
to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update drafts"
on public.content_drafts for update
to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete drafts"
on public.content_drafts for delete
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read approvals"
on public.approvals for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create approvals"
on public.approvals for insert
to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update approvals"
on public.approvals for update
to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete approvals"
on public.approvals for delete
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read tasks"
on public.agent_tasks for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create tasks"
on public.agent_tasks for insert
to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update tasks"
on public.agent_tasks for update
to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete tasks"
on public.agent_tasks for delete
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read audit events"
on public.audit_events for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

alter table public.content_drafts
  drop constraint if exists content_drafts_status_check;

alter table public.content_drafts
  add constraint content_drafts_status_check
  check (status in ('idea', 'generating', 'draft', 'in_review', 'approved', 'rejected', 'scheduled', 'published', 'failed'));

alter table public.approvals
  drop constraint if exists approvals_status_check;

alter table public.approvals
  add constraint approvals_status_check
  check (status in ('pending', 'approved', 'rejected', 'changes_requested'));
