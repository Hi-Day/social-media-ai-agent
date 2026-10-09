-- Workspace monthly credit budgets and atomic campaign execution reservations.
-- The budget is expressed in product credits, not provider-billed USD.
create table if not exists public.workspace_usage_budgets (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  monthly_credit_limit numeric(12,4) not null check (monthly_credit_limit > 0 and monthly_credit_limit <= 1000000000),
  hard_limit boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_usage_budgets enable row level security;
revoke all on public.workspace_usage_budgets from anon;
grant select, insert, update on public.workspace_usage_budgets to authenticated;

create policy "workspace members can read usage budgets"
on public.workspace_usage_budgets for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "workspace admins can create usage budgets"
on public.workspace_usage_budgets for insert to authenticated
with check (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = workspace_usage_budgets.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin')
));

create policy "workspace admins can update usage budgets"
on public.workspace_usage_budgets for update to authenticated
using (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = workspace_usage_budgets.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin')
))
with check (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = workspace_usage_budgets.workspace_id
    and wm.user_id = (select auth.uid())
    and wm.role in ('owner','admin')
));

create table if not exists public.campaign_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  reserved_credits numeric(12,4) not null check (reserved_credits >= 0),
  status text not null default 'active' check (status in ('active','consumed','released')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists idx_campaign_usage_reservations_active
  on public.campaign_usage_reservations(workspace_id, expires_at)
  where status = 'active';

alter table public.campaign_usage_reservations enable row level security;
revoke all on public.campaign_usage_reservations from public, anon, authenticated;

create or replace function public.reserve_campaign_usage(
  p_workspace_id uuid,
  p_campaign_id uuid,
  p_credits numeric
) returns table (
  allowed boolean,
  budget_configured boolean,
  monthly_credit_limit numeric,
  used_credits numeric,
  reserved_credits numeric,
  remaining_credits numeric,
  reservation_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_limit numeric;
  v_hard_limit boolean;
  v_used numeric := 0;
  v_reserved numeric := 0;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  v_reservation_id uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_credits is null or p_credits < 0 then raise exception 'invalid_credit_reservation'; end if;

  select wm.role into v_role
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id;
  if v_role is null then raise exception 'workspace_forbidden'; end if;
  if v_role not in ('owner','admin') then raise exception 'campaign_execution_forbidden'; end if;

  if not exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id and c.workspace_id = p_workspace_id
  ) then raise exception 'campaign_workspace_mismatch'; end if;

  -- Locking the budget row serializes reservations for a configured workspace.
  select b.monthly_credit_limit, b.hard_limit
  into v_limit, v_hard_limit
  from public.workspace_usage_budgets b
  where b.workspace_id = p_workspace_id
  for update;

  if not found then
    return query select true, false, null::numeric, 0::numeric, 0::numeric, null::numeric, null::uuid;
    return;
  end if;

  select coalesce(sum(e.estimated_credits), 0) into v_used
  from public.campaign_usage_events e
  where e.workspace_id = p_workspace_id and e.created_at >= v_month_start;

  select coalesce(sum(r.reserved_credits), 0) into v_reserved
  from public.campaign_usage_reservations r
  where r.workspace_id = p_workspace_id and r.status = 'active' and r.expires_at > now();

  if v_hard_limit and v_used + v_reserved + p_credits > v_limit then
    return query select false, true, v_limit, v_used, v_reserved,
      greatest(0, v_limit - v_used - v_reserved), null::uuid;
    return;
  end if;

  insert into public.campaign_usage_reservations(workspace_id,campaign_id,actor_user_id,reserved_credits)
  values (p_workspace_id,p_campaign_id,v_user_id,p_credits)
  returning id into v_reservation_id;

  return query select true, true, v_limit, v_used, v_reserved,
    greatest(0, v_limit - v_used - v_reserved - p_credits), v_reservation_id;
end;
$$;

revoke all on function public.reserve_campaign_usage(uuid,uuid,numeric) from public, anon;
grant execute on function public.reserve_campaign_usage(uuid,uuid,numeric) to authenticated;

create or replace function public.finalize_campaign_usage_reservation(
  p_reservation_id uuid,
  p_status text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reservation public.campaign_usage_reservations%rowtype;
begin
  if v_user_id is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('consumed','released') then raise exception 'invalid_reservation_status'; end if;

  select * into v_reservation
  from public.campaign_usage_reservations r
  where r.id = p_reservation_id
  for update;

  if not found then return false; end if;
  if v_reservation.actor_user_id <> v_user_id then raise exception 'reservation_actor_mismatch'; end if;
  if v_reservation.status <> 'active' then return false; end if;

  update public.campaign_usage_reservations
  set status = p_status, finalized_at = now()
  where id = p_reservation_id;

  return true;
end;
$$;

revoke all on function public.finalize_campaign_usage_reservation(uuid,text) from public, anon;
grant execute on function public.finalize_campaign_usage_reservation(uuid,text) to authenticated;
