-- Expose the existing private, auth.uid()-checked workspace bootstrap through
-- a narrowly granted PostgREST RPC. The wrapper is SECURITY INVOKER; the private
-- function remains responsible for the atomic privileged writes.
create or replace function public.create_workspace(
  p_name text,
  p_brand_name text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_workspace(p_name, p_brand_name);
$$;

revoke all on function public.create_workspace(text, text) from public, anon, authenticated;
grant execute on function public.create_workspace(text, text) to authenticated;
