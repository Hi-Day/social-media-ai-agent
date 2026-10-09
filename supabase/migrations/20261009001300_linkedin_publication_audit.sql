create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  provider text not null check (provider in ('linkedin')),
  status text not null check (status in ('pending','published','failed','unknown')),
  provider_post_id text,
  provider_status_code integer,
  error_code text,
  initiated_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'published') or provider_post_id is not null)
);

create index if not exists idx_social_publications_workspace_created
  on public.social_publications(workspace_id, created_at desc);
create index if not exists idx_social_publications_draft
  on public.social_publications(draft_id, created_at desc);

-- A draft can be retried after a definite provider rejection, but not while in flight,
-- after a successful publish, or when the provider outcome is ambiguous.
create unique index if not exists idx_social_publications_one_active_attempt
  on public.social_publications(workspace_id, draft_id, provider)
  where status in ('pending','published','unknown');

alter table public.social_publications enable row level security;
revoke all on public.social_publications from anon;
grant select, insert, update on public.social_publications to authenticated;

create policy "workspace admins can view social publications"
  on public.social_publications for select to authenticated
  using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = social_publications.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  ));

create policy "workspace admins can create social publications"
  on public.social_publications for insert to authenticated
  with check (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = social_publications.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
      and wm.user_id = social_publications.initiated_by
  ));

create policy "workspace admins can update social publications"
  on public.social_publications for update to authenticated
  using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = social_publications.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  ))
  with check (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = social_publications.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  ));
