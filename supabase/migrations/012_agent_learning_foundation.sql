-- Agent learning foundation: persistent memories, measured insights, and actionable recommendations.
-- LLMs may propose these records, but deterministic policies decide whether they become durable
-- and whether a recommendation can be executed.

create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  memory_type text not null check (memory_type in ('semantic','episodic','performance','policy')),
  memory_key text not null,
  content jsonb not null default '{}'::jsonb,
  source_type text not null check (source_type in ('user','system','analytics','campaign','agent','external')),
  source_ref uuid,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  approved boolean not null default false,
  status text not null default 'active' check (status in ('active','superseded','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_agent_memories_active_key
  on public.agent_memories(workspace_id, memory_type, memory_key)
  where status = 'active';

create index if not exists idx_agent_memories_workspace_type
  on public.agent_memories(workspace_id, memory_type, updated_at desc);

create table if not exists public.performance_insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  insight_type text not null check (insight_type in ('trend','anomaly','winner','underperformer','audience','platform','content_fatigue','experiment')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  finding text not null,
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'active' check (status in ('active','superseded','dismissed')),
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists idx_performance_insights_workspace_period
  on public.performance_insights(workspace_id, period_end desc);

create index if not exists idx_performance_insights_campaign
  on public.performance_insights(workspace_id, campaign_id);

create table if not exists public.agent_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  insight_id uuid references public.performance_insights(id) on delete set null,
  action_type text not null,
  title text not null,
  rationale text not null,
  evidence jsonb not null default '[]'::jsonb,
  expected_impact jsonb not null default '{}'::jsonb,
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','executing','completed','expired')),
  expires_at timestamptz,
  created_by text not null default 'agent' check (created_by in ('agent','user','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_recommendations_workspace_status
  on public.agent_recommendations(workspace_id, status, priority, created_at desc);

create index if not exists idx_agent_recommendations_campaign
  on public.agent_recommendations(workspace_id, campaign_id);

alter table public.agent_memories enable row level security;
alter table public.performance_insights enable row level security;
alter table public.agent_recommendations enable row level security;

revoke all on table public.agent_memories, public.performance_insights, public.agent_recommendations
from anon, authenticated;

grant select, insert, update, delete on public.agent_memories to authenticated;
grant select, insert, update, delete on public.performance_insights to authenticated;
grant select, insert, update, delete on public.agent_recommendations to authenticated;

create policy "members can read memories"
on public.agent_memories for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create memories"
on public.agent_memories for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update memories"
on public.agent_memories for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete memories"
on public.agent_memories for delete to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read performance insights"
on public.performance_insights for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create performance insights"
on public.performance_insights for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update performance insights"
on public.performance_insights for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete performance insights"
on public.performance_insights for delete to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can read recommendations"
on public.agent_recommendations for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members can create recommendations"
on public.agent_recommendations for insert to authenticated
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can update recommendations"
on public.agent_recommendations for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));

create policy "members can delete recommendations"
on public.agent_recommendations for delete to authenticated
using ((select private.is_workspace_member(workspace_id)));
