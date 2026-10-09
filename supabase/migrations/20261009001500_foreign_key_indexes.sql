-- Cover foreign-key columns used by ownership checks and parent-row updates/deletes.
-- These are separate from composite workspace-first indexes: PostgreSQL can only use
-- a composite B-tree efficiently when its leading column(s) are constrained.
create index if not exists idx_campaign_usage_events_actor_user
  on public.campaign_usage_events (actor_user_id);
create index if not exists idx_campaign_usage_events_campaign_id
  on public.campaign_usage_events (campaign_id);
create index if not exists idx_campaign_usage_events_content_draft
  on public.campaign_usage_events (content_draft_id);
create index if not exists idx_campaign_usage_reservations_actor_user
  on public.campaign_usage_reservations (actor_user_id);
create index if not exists idx_campaign_usage_reservations_campaign_id
  on public.campaign_usage_reservations (campaign_id);
create index if not exists idx_social_connections_connected_by
  on public.social_connections (connected_by);
create index if not exists idx_social_publications_initiated_by
  on public.social_publications (initiated_by);
create index if not exists idx_workspace_usage_budgets_updated_by
  on public.workspace_usage_budgets (updated_by);
