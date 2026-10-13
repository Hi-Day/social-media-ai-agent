-- TikTok OAuth needs refresh-token storage; provider allowlist is extended after
-- the Instagram foundation so both integrations can coexist.
alter table public.social_connections
  drop constraint if exists social_connections_provider_check;
alter table public.social_connections
  add constraint social_connections_provider_check check (provider in ('linkedin', 'instagram', 'tiktok'));

alter table public.social_publications
  drop constraint if exists social_publications_provider_check;
alter table public.social_publications
  add constraint social_publications_provider_check check (provider in ('linkedin', 'instagram', 'tiktok'));

alter table public.social_connections
  add column if not exists encrypted_refresh_token text,
  add column if not exists refresh_token_expires_at timestamptz;
