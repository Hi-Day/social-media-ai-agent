drop policy if exists "members can delete memories" on public.agent_memories;
create policy "admins can delete memories"
on public.agent_memories for delete to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = agent_memories.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  )
);
