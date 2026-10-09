-- Controlled audit writes for learning-loop API actions. Clients cannot choose arbitrary action names or actor identities.
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
begin
 if v_user_id is null then raise exception 'not_authenticated'; end if;
 if not exists (select 1 from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id) then raise exception 'workspace_forbidden'; end if;
 if p_action is null or p_action not in ('agent.memory.created','agent.memory.approved','agent.memory.archived','agent.observations.created','agent.learning.analyzed','agent.recommendation.approved','agent.recommendation.rejected','campaign.replan.proposed') then raise exception 'audit_action_not_allowed'; end if;
 insert into public.audit_events(workspace_id,actor_type,action,resource_type,resource_id,metadata)
 values (p_workspace_id,'user',p_action,p_resource_type,p_resource_id,coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('actor_user_id',v_user_id))
 returning id into v_id;
 return v_id;
end;
$$;
revoke all on function public.append_audit_event(uuid,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.append_audit_event(uuid,text,text,uuid,jsonb) to authenticated;
