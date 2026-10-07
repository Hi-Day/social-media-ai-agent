-- Transactional workflow hardening for campaign selection and content review.

create or replace function public.select_campaign_package(
  p_workspace_id uuid,
  p_campaign_id uuid,
  p_package_code text,
  p_tasks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_campaign campaigns%rowtype;
  v_package content_packages%rowtype;
  v_inserted int;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Unauthorized';
  end if;

  select role into v_role from workspace_members
  where workspace_id = p_workspace_id and user_id = v_user_id;
  if v_role is null then
    raise exception using errcode = '42501', message = 'Forbidden';
  end if;

  select * into v_campaign from campaigns
  where id = p_campaign_id and workspace_id = p_workspace_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found.';
  end if;

  if v_campaign.selected_package is not null then
    raise exception using errcode = '23505', message = 'A package is already selected for this campaign.';
  end if;

  select * into v_package from content_packages
  where campaign_id = p_campaign_id and workspace_id = p_workspace_id and code = p_package_code;
  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign package not found.';
  end if;

  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then
    raise exception using errcode = '22023', message = 'The selected package has no content tasks.';
  end if;

  insert into content_drafts (
    workspace_id, title, platform, caption, status,
    campaign_id, package_id, content_type, model_codename, estimated_credits
  )
  select
    p_workspace_id, x->>'title', coalesce(x->>'platform', 'Multi-platform'),
    coalesce(x->>'caption', 'Campaign content task'), 'idea', p_campaign_id,
    v_package.id, coalesce(x->>'content_type', 'Content'), x->>'model_codename',
    coalesce((x->>'estimated_credits')::numeric, 0)
  from jsonb_array_elements(p_tasks) as x;

  get diagnostics v_inserted = row_count;

  update campaigns
  set selected_package = p_package_code, status = 'planned', updated_at = now()
  where id = p_campaign_id and workspace_id = p_workspace_id;

  return jsonb_build_object(
    'campaign_id', p_campaign_id, 'package_code', p_package_code,
    'estimated_credits', v_package.estimated_credits, 'inserted_tasks', v_inserted
  );
end;
$$;

grant execute on function public.select_campaign_package(uuid, uuid, text, jsonb) to authenticated;


create or replace function public.review_content_draft(
  p_draft_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_draft content_drafts%rowtype;
  v_approval approvals%rowtype;
  v_next_draft_status text;
  v_next_approval_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Unauthorized';
  end if;

  select * into v_draft from content_drafts where id = p_draft_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Draft not found.';
  end if;

  select role into v_role from workspace_members
  where workspace_id = v_draft.workspace_id and user_id = v_user_id;
  if v_role is null then
    raise exception using errcode = '42501', message = 'Forbidden';
  end if;

  if p_action = 'submit' then
    if v_draft.status not in ('draft', 'rejected', 'idea') then
      raise exception using errcode = '23514', message = 'Draft is not ready for approval.';
    end if;

    select * into v_approval from approvals
    where content_draft_id = v_draft.id and status = 'pending'
    order by created_at desc limit 1 for update;
    if found then
      raise exception using errcode = '23505', message = 'Draft already has a pending approval.';
    end if;

    insert into approvals(workspace_id, content_draft_id, status)
    values (v_draft.workspace_id, v_draft.id, 'pending')
    returning * into v_approval;

    update content_drafts set status = 'in_review', updated_at = now()
    where id = v_draft.id;

  elsif p_action in ('approve', 'reject', 'changes_requested') then
    if v_role not in ('owner', 'admin') then
      raise exception using errcode = '42501', message = 'Only workspace owners and admins can review content.';
    end if;
    if v_draft.status <> 'in_review' then
      raise exception using errcode = '23514', message = 'Draft is not awaiting review.';
    end if;

    select * into v_approval from approvals
    where content_draft_id = v_draft.id and status = 'pending'
    order by created_at desc limit 1 for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Pending approval not found.';
    end if;

    v_next_draft_status := case
      when p_action = 'approve' then 'approved'
      when p_action = 'changes_requested' then 'draft'
      else 'rejected' end;
    v_next_approval_status := case
      when p_action = 'approve' then 'approved'
      else p_action end;

    update approvals set status = v_next_approval_status, reviewer_id = v_user_id
    where id = v_approval.id;
    update content_drafts set status = v_next_draft_status, updated_at = now()
    where id = v_draft.id;
  else
    raise exception using errcode = '22023', message = 'Unsupported review action.';
  end if;

  return jsonb_build_object(
    'draft_id', v_draft.id, 'workspace_id', v_draft.workspace_id,
    'draft_status', (select status from content_drafts where id = v_draft.id),
    'approval_id', v_approval.id,
    'approval_status', (select status from approvals where id = v_approval.id)
  );
end;
$$;

grant execute on function public.review_content_draft(uuid, text) to authenticated;
