-- Restrict Brand Brain writes to workspace owners and admins.
drop policy if exists "members can update brands" on public.brands;

create policy "admins can update brands"
on public.brands for update
to authenticated
using (
  (select private.is_workspace_owner(workspace_id))
  or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = brands.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = 'admin'
  )
)
with check (
  (select private.is_workspace_owner(workspace_id))
  or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = brands.workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = 'admin'
  )
);
