-- Track execution of planned campaign content without pretending unavailable
-- media providers have already generated assets.

alter table public.content_drafts
  add column if not exists generation_status text not null default 'pending',
  add column if not exists generation_error text,
  add column if not exists generated_at timestamptz,
  add column if not exists generation_metadata jsonb not null default '{}'::jsonb;

alter table public.content_drafts
  drop constraint if exists content_drafts_generation_status_check;

alter table public.content_drafts
  add constraint content_drafts_generation_status_check
  check (generation_status in ('pending','generating','generated','provider_unavailable','failed'));

create index if not exists idx_content_drafts_generation_status
  on public.content_drafts(workspace_id,generation_status);
