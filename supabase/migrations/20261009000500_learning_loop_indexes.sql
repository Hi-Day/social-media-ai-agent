-- Cover foreign-key columns for joins and referential actions identified by Supabase advisors.
create index if not exists idx_agent_recommendations_campaign_id on public.agent_recommendations(campaign_id);
create index if not exists idx_agent_recommendations_insight_id on public.agent_recommendations(insight_id);
create index if not exists idx_performance_insights_campaign_id on public.performance_insights(campaign_id);
create index if not exists idx_approvals_workspace_id on public.approvals(workspace_id);
create index if not exists idx_content_packages_workspace_id on public.content_packages(workspace_id);
