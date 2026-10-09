# Closed-Loop Learning Runtime

## Flow

1. A workspace member records observations. The API labels them as manual, never provider-verified.
2. A deterministic analyzer compares adjacent seven-day windows by platform and metric.
3. A finding is emitted only when each window has at least two observations and the relative change reaches 15 percent. A zero baseline never becomes a fabricated percentage.
4. Findings retain window averages, sample sizes, evidence, and a conservative confidence score.
5. Recommendations remain proposals; expected numeric lift is omitted until controlled experiments establish causality.
6. Owners/admins approve or reject recommendations and validate or archive user-submitted memories.
7. Owners/admins may attach approved recommendations to a campaign's proposed plan revision. It requires approval and does not authorize publishing or execution.

## Workspace UI

The main navigation exposes the workflow under Learning Loop. It includes manual observation capture, recent observations, memory review, insight and recommendation review, and a proposed-replan action.

## API

- GET /api/agent/learning?workspaceId=... lists memories, insights, recommendations, and recent observations.
- POST action=remember saves user-provided memory as unapproved.
- POST action=approve-memory or archive-memory is owner/admin only.
- POST action=observe accepts 1–100 manual observations.
- POST action=analyze compares observations in the preceding 14 days and persists findings and proposed recommendations; optionally pass campaignId.
- POST action=approve-recommendation or reject-recommendation is owner/admin only.
- POST action=replan is owner/admin only and requires approved, unexpired recommendations linked to that campaign.

## Trust boundaries

- The model does not generate or approve metrics.
- Unsupported metrics, negative values, and inadequate samples are rejected or ignored.
- Manual data stays labelled manual. Provider integrations must use a trusted server-side ingestion path.
- Recommendations and replanning never schedule, publish, or execute content.
- RLS scopes rows to workspace membership; elevated lifecycle transitions are restricted to owners/admins.
- User-provided memory is unapproved by default.
- Mutating learning actions write workspace-scoped audit events through a constrained server-side function with an allowlist of actions.

## Limitation

This does not yet connect social-platform APIs. Before representing metrics as verified, add trusted server-side provider ingestion, idempotent metric reconciliation, and sandbox end-to-end tests.
