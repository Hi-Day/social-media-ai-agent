# Provider Analytics Ingestion Contract

## Goal
Expose trustworthy social performance metrics without implying that locally stored observations are live provider analytics. This document is a contract for implementation; it does not mean provider ingestion is already enabled.

## Data model
Each metric observation should include:
- `workspace_id` and the connected provider account identifier;
- `provider` and provider object/post identifier;
- `metric_key` and numeric `metric_value`;
- `observed_at` (provider event time when available);
- `fetched_at` (time our server fetched the metric);
- `source` = provider API, user-entered, or internal estimate;
- `provider_api_version` and ingestion status where applicable;
- a stable idempotency key for upserts.

Do not store access tokens in analytics rows. Do not log raw provider responses if they may contain personal data or credentials.

## Ingestion behavior
1. Require a valid authenticated workspace and an explicitly connected provider account.
2. Fetch only metrics/scopes supported by that provider and account tier.
3. Normalize provider responses into a versioned internal metric schema.
4. Upsert by provider account + object + metric key + observation time.
5. Store fetch time separately from provider event time.
6. On rate limit, respect provider retry guidance and use bounded exponential backoff.
7. On revoked/expired authorization, mark the connection as requiring reconnect; do not loop indefinitely.
8. Treat missing, null, or unsupported metrics as unavailable, not zero.
9. Keep ingestion failures distinct from a genuine zero-performance result.
10. Prevent cross-workspace reads and writes at the database and API layers.

## Dashboard freshness semantics
- **Live**: fetched from provider API successfully, with a recent `fetched_at` inside a provider-specific freshness window.
- **Stale**: valid provider observation exists but is older than the configured freshness window.
- **Manual**: explicitly entered by a user and labeled as such.
- **Estimated**: computed internally and labeled with the formula/assumptions.
- **Unavailable**: no authorized source or the provider does not expose that metric.

Never label data live merely because a database row exists. Preserve the existing provenance behavior.

## Acceptance tests
- [ ] No connection or invalid authorization yields unavailable/reconnect-required, never live.
- [ ] Provider metric of 0 remains a valid zero, distinct from missing/null.
- [ ] Re-ingesting the same observation is idempotent.
- [ ] Expired tokens and 429/5xx responses produce bounded retry behavior.
- [ ] Stale data is labeled stale after its freshness window.
- [ ] Workspace A cannot read or write Workspace B's observations.
- [ ] Unsupported metrics are not fabricated or silently converted to zero.
- [ ] Logs redact tokens and sensitive provider payload fields.

## Rollout
Start with LinkedIn metrics available to the authorized application. Add other providers only after their API access, scopes, terms, and metric definitions are verified. Use feature flags and do not present the integration as production-ready until a real authorized-account test is recorded.