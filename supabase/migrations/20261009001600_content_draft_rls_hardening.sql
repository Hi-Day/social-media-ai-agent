-- Remove permissive metadata policies that bypass workspace membership whenever
-- campaign_id is NULL. workspace_id is NOT NULL, so membership must gate all rows.
-- The existing "members can read/create drafts" policies remain the source of access control.
drop policy if exists "members can create campaign draft metadata" on public.content_drafts;
drop policy if exists "members can read campaign draft metadata" on public.content_drafts;
