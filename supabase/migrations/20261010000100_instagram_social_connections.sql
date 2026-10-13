-- Extend the shared social connection/publication audit tables to Instagram.
-- OAuth tokens remain encrypted using the existing SOCIAL_TOKEN_ENCRYPTION_KEY.
alter table public.social_connections
  drop constraint if exists social_connections_provider_check;
alter table public.social_connections
  add constraint social_connections_provider_check check (provider in ('linkedin', 'instagram'));

alter table public.social_publications
  drop constraint if exists social_publications_provider_check;
alter table public.social_publications
  add constraint social_publications_provider_check check (provider in ('linkedin', 'instagram'));
