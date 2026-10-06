-- Prevent multiple simultaneous pending approvals for the same draft.
create unique index if not exists idx_one_pending_approval_per_draft
  on public.approvals(content_draft_id)
  where status = 'pending';
