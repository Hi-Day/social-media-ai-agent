-- Store provider-reported usage separately from estimated product credits.
-- A missing cost is unknown, never treated as zero-dollar usage.
alter table public.campaign_usage_events
  add column if not exists prompt_tokens bigint check (prompt_tokens is null or prompt_tokens >= 0),
  add column if not exists completion_tokens bigint check (completion_tokens is null or completion_tokens >= 0),
  add column if not exists total_tokens bigint check (total_tokens is null or total_tokens >= 0),
  add column if not exists provider_cost_usd numeric(14,8) check (provider_cost_usd is null or provider_cost_usd >= 0),
  add column if not exists cost_source text not null default 'not_available'
    check (cost_source in ('provider_reported','partial','not_available','demo'));

comment on column public.campaign_usage_events.provider_cost_usd is
  'Provider-reported USD cost when supplied by the gateway response; NULL means unknown, not free.';
comment on column public.campaign_usage_events.cost_source is
  'provider_reported: all metered provider operations returned a cost; partial: only some did; not_available: no cost returned; demo: no provider call was made.';
