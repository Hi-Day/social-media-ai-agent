create or replace function public.create_workspace_for_current_user(
  p_name text,
  p_brand_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_brand_name text := nullif(trim(coalesce(p_brand_name, '')), '');
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if length(v_name) < 2 then
    raise exception 'workspace_name_required' using errcode = '22023';
  end if;

  insert into public.workspaces(name)
  values (v_name)
  returning id into v_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  insert into public.brands(workspace_id, name)
  values (v_workspace_id, coalesce(v_brand_name, v_name));

  return v_workspace_id;
end;
$$;

revoke all on function public.create_workspace_for_current_user(text, text) from public, anon;
grant execute on function public.create_workspace_for_current_user(text, text) to authenticated;
