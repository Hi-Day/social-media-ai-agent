-- Media asset tracking for provider-backed image generation.
alter table public.content_drafts
  add column if not exists media_status text not null default 'not_required',
  add column if not exists media_url text,
  add column if not exists media_metadata jsonb not null default '{}'::jsonb;

alter table public.content_drafts
  drop constraint if exists content_drafts_media_status_check;

alter table public.content_drafts
  add constraint content_drafts_media_status_check
  check (media_status in ('not_required','pending','generating','generated','failed','provider_unavailable'));

create index if not exists idx_content_drafts_media_status
  on public.content_drafts(workspace_id,media_status);
