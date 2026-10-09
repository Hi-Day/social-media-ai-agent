-- Append-only campaign usage ledger. Credits are product estimates, not provider invoice amounts.
create table if not exists public.campaign_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  content_draft_id uuid not null references public.content_drafts(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  model_codename text,
  estimated_credits numeric(12,4) not null default 0 check (estimated_credits >= 0),
  result_status text not null check (result_status in ('generated','media_pending','failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_campaign_usage_workspace_time
  on public.campaign_usage_events(workspace_id, created_at desc);
create index if not exists idx_campaign_usage_campaign
  on public.campaign_usage_events(workspace_id, campaign_id, created_at desc);

alter table public.campaign_usage_events enable row level security;
revoke all on public.campaign_usage_events from anon;
grant select, insert on public.campaign_usage_events to authenticated;

create policy "workspace members can read campaign usage"
on public.campaign_usage_events for select
to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "workspace admins can append campaign usage"
on public.campaign_usage_events for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = campaign_usage_events.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  )
  and exists (
    select 1 from public.campaigns c
    where c.id = campaign_usage_events.campaign_id
      and c.workspace_id = campaign_usage_events.workspace_id
  )
  and exists (
    select 1 from public.content_drafts d
    where d.id = campaign_usage_events.content_draft_id
      and d.workspace_id = campaign_usage_events.workspace_id
      and d.campaign_id = campaign_usage_events.campaign_id
  )
);

-- Usage events are immutable: no update/delete grants or policies are provided.
