-- Runtime data for closed-loop learning. Browser-entered metrics are labelled manual.
create table if not exists public.performance_observations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 metric_key text not null check (metric_key in ('impressions','reach','likes','comments','shares','saves','clicks','engagement_rate','conversions')),
 platform text not null check (platform in ('instagram','facebook','linkedin','tiktok','youtube','x','other')),
 value numeric(18,4) not null check (value >= 0), observed_at timestamptz not null, post_ref text,
 source_type text not null default 'manual' check (source_type in ('manual','provider','system')),
 evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists idx_performance_observations_workspace_time on public.performance_observations(workspace_id, observed_at desc);
create index if not exists idx_performance_observations_grouping on public.performance_observations(workspace_id, platform, metric_key, observed_at desc);
alter table public.performance_observations enable row level security;
revoke all on public.performance_observations from anon;
grant select, insert on public.performance_observations to authenticated;
create policy "members can read performance observations" on public.performance_observations for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members can add manual observations" on public.performance_observations for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and source_type = 'manual');

-- Members can save unapproved user memory only; promotion and lifecycle changes are admin-only.
drop policy if exists "members can create memories" on public.agent_memories;
create policy "members can create unapproved memories" on public.agent_memories for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and approved = false and source_type = 'user');
drop policy if exists "members can update memories" on public.agent_memories;
create policy "admins can update memories" on public.agent_memories for update to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = agent_memories.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin'))) with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = agent_memories.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));

drop policy if exists "members can update performance insights" on public.performance_insights;
create policy "admins can update performance insights" on public.performance_insights for update to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = performance_insights.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin'))) with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = performance_insights.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));
drop policy if exists "members can delete performance insights" on public.performance_insights;
create policy "admins can delete performance insights" on public.performance_insights for delete to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = performance_insights.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));

drop policy if exists "members can create recommendations" on public.agent_recommendations;
create policy "members can create proposed recommendations" on public.agent_recommendations for insert to authenticated with check ((select private.is_workspace_member(workspace_id)) and status = 'proposed');
drop policy if exists "members can update recommendations" on public.agent_recommendations;
create policy "admins can update recommendations" on public.agent_recommendations for update to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = agent_recommendations.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin'))) with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = agent_recommendations.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));
drop policy if exists "members can delete recommendations" on public.agent_recommendations;
create policy "admins can delete recommendations" on public.agent_recommendations for delete to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = agent_recommendations.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner','admin')));

create or replace function private.validate_recommendation_workspace() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.insight_id is not null and not exists (select 1 from public.performance_insights pi where pi.id = new.insight_id and pi.workspace_id = new.workspace_id) then raise exception 'recommendation_insight_workspace_mismatch'; end if;
 if new.campaign_id is not null and not exists (select 1 from public.campaigns c where c.id = new.campaign_id and c.workspace_id = new.workspace_id) then raise exception 'recommendation_campaign_workspace_mismatch'; end if;
 return new;
end;
$$;
revoke all on function private.validate_recommendation_workspace() from public, anon, authenticated;
drop trigger if exists validate_recommendation_workspace on public.agent_recommendations;
create trigger validate_recommendation_workspace before insert or update on public.agent_recommendations for each row execute function private.validate_recommendation_workspace();
