-- Harden audit append RPC by validating that the claimed event matches persisted workspace state.
create or replace function public.append_audit_event(
 p_workspace_id uuid,
 p_action text,
 p_resource_type text,
 p_resource_id uuid default null,
 p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_user_id uuid := (select auth.uid());
 v_id uuid;
 v_role text;
 v_expected integer;
 v_actual integer;
begin
 if v_user_id is null then raise exception 'not_authenticated'; end if;
 select wm.role into v_role from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id;
 if v_role is null then raise exception 'workspace_forbidden'; end if;
 if p_action is null then raise exception 'audit_action_not_allowed'; end if;

 if p_action = 'agent.memory.created' then
  if p_resource_type <> 'agent_memory' or not exists (select 1 from public.agent_memories m where m.id = p_resource_id and m.workspace_id = p_workspace_id and m.source_type = 'user' and m.approved = false and m.status = 'active') then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'agent.memory.approved' then
  if v_role not in ('owner','admin') or p_resource_type <> 'agent_memory' or not exists (select 1 from public.agent_memories m where m.id = p_resource_id and m.workspace_id = p_workspace_id and m.approved = true and m.status = 'active') then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'agent.memory.archived' then
  if v_role not in ('owner','admin') or p_resource_type <> 'agent_memory' or not exists (select 1 from public.agent_memories m where m.id = p_resource_id and m.workspace_id = p_workspace_id and m.status = 'archived') then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'agent.observations.created' then
  v_expected := coalesce((p_metadata->>'count')::integer, 0);
  select count(*) into v_actual from public.performance_observations o where o.workspace_id = p_workspace_id and o.source_type = 'manual' and o.evidence->>'entered_by' = v_user_id::text and o.created_at >= now() - interval '5 minutes';
  if p_resource_type <> 'performance_observation' or v_expected < 1 or v_expected > 100 or v_actual < v_expected then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'agent.learning.analyzed' then
  v_expected := coalesce((p_metadata->>'insight_count')::integer, 0);
  if v_expected < 1 or coalesce((p_metadata->>'recommendation_count')::integer, 0) < 1 or not exists (select 1 from public.performance_insights pi where pi.workspace_id = p_workspace_id and pi.created_at >= now() - interval '5 minutes' and (p_resource_id is null or pi.campaign_id = p_resource_id)) or not exists (select 1 from public.agent_recommendations r where r.workspace_id = p_workspace_id and r.created_at >= now() - interval '5 minutes' and (p_resource_id is null or r.campaign_id = p_resource_id)) then raise exception 'audit_event_state_mismatch'; end if;
  select count(*) into v_actual from public.performance_insights pi where pi.workspace_id = p_workspace_id and pi.created_at >= now() - interval '5 minutes' and (p_resource_id is null or pi.campaign_id = p_resource_id);
  if v_actual < v_expected then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'agent.recommendation.approved' then
  if v_role not in ('owner','admin') or p_resource_type <> 'agent_recommendation' or not exists (select 1 from public.agent_recommendations r where r.id = p_resource_id and r.workspace_id = p_workspace_id and r.status = 'approved') then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'agent.recommendation.rejected' then
  if v_role not in ('owner','admin') or p_resource_type <> 'agent_recommendation' or not exists (select 1 from public.agent_recommendations r where r.id = p_resource_id and r.workspace_id = p_workspace_id and r.status = 'rejected') then raise exception 'audit_event_state_mismatch'; end if;
 elsif p_action = 'campaign.replan.proposed' then
  if v_role not in ('owner','admin') or p_resource_type <> 'campaign' or not exists (
   select 1 from public.campaigns c where c.id = p_resource_id and c.workspace_id = p_workspace_id
    and c.plan #> '{proposed_replan,execution_authorized}' = 'false'::jsonb
    and c.plan #> '{proposed_replan,approval_required}' = 'true'::jsonb
    and c.plan #> '{proposed_replan,based_on_recommendation_ids}' = p_metadata->'recommendation_ids'
  ) then raise exception 'audit_event_state_mismatch'; end if;
 else
  raise exception 'audit_action_not_allowed';
 end if;

 insert into public.audit_events(workspace_id,actor_type,action,resource_type,resource_id,metadata)
 values (p_workspace_id,'user',p_action,p_resource_type,p_resource_id,coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('actor_user_id',v_user_id))
 returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.append_audit_event(uuid,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.append_audit_event(uuid,text,text,uuid,jsonb) to authenticated;
