-- Keep the public RPC as an invoker wrapper. The existing private function
-- performs the atomic writes under its tightly scoped privileged body
-- and validates auth.uid(); the public wrapper itself needs no elevated rights.
create or replace function public.create_workspace_for_current_user(
  p_name text,
  p_brand_name text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_workspace(p_name, p_brand_name);
$$;

revoke all on function public.create_workspace_for_current_user(text, text) from public, anon, authenticated;
grant execute on function public.create_workspace_for_current_user(text, text) to authenticated;
