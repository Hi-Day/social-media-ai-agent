-- Connect selected campaign packages to the existing content approval pipeline.
alter table public.content_drafts add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.content_drafts add column if not exists package_id uuid references public.content_packages(id) on delete set null;
alter table public.content_drafts add column if not exists content_type text;
alter table public.content_drafts add column if not exists model_codename text;
alter table public.content_drafts add column if not exists estimated_credits numeric(12,4);

create index if not exists idx_content_drafts_campaign on public.content_drafts(campaign_id);
create index if not exists idx_content_drafts_package on public.content_drafts(package_id);

create policy "members can read campaign draft metadata"
on public.content_drafts for select to authenticated
using (campaign_id is null or (select private.is_workspace_member(workspace_id)));

create policy "members can create campaign draft metadata"
on public.content_drafts for insert to authenticated
with check (campaign_id is null or (select private.is_workspace_member(workspace_id)));
