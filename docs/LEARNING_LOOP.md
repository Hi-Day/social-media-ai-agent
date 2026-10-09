# Closed-Loop Learning Runtime

The learning loop compares stored observations across adjacent seven-day periods, produces evidence-backed insights, drafts low-risk recommendations, and requires owner/admin approval before adding a proposed revision to a campaign plan.

## API
- GET /api/agent/learning?workspaceId=... lists memories, insights, and recommendations.
- POST action=remember stores user memory as unapproved.
- POST action=observe accepts up to 100 manual observations.
- POST action=analyze compares observations from the prior 14 days and creates insights and proposed recommendations. Optionally provide campaignId.
- POST action=approve-recommendation or reject-recommendation is owner/admin only.
- POST action=replan is owner/admin only and requires approved, unexpired recommendations linked to the campaign.

## Guardrails
- Metrics entered through this API remain labelled manual, not provider-verified.
- A trend requires at least two observations in both adjacent windows and a change of at least 15 percent. Zero baselines do not get a fabricated percentage.
- Recommendations include evidence and do not invent numeric lift forecasts.
- Learning and replanning never schedule, publish, or execute content.
- RLS enforces workspace membership; owners/admins control lifecycle transitions.
- User-provided memory is unapproved by default.

## Limitation
This does not yet connect social-platform APIs. Before representing metrics as verified, add trusted server-side provider ingestion, idempotent metric reconciliation, and sandbox end-to-end tests.
