# Commercial Pilot Acceptance — Rp30M/month target

This is a validation plan, not a claim that the current product already supports all items.

## Customer outcome

A pilot customer should be able to run a complete campaign workflow: brand/context setup → campaign brief → platform-specific content → human approval → publish/schedule where integration is supported → measure results → review next-step recommendations.

## Pilot acceptance gates

1. **Workflow value:** customer completes one campaign without undocumented operator intervention.
2. **Content quality:** customer scores relevance, brand fit, factuality, and platform fit against a fixed rubric; revisions are recorded.
3. **Governance:** no external publish without authorized approval; every publish attempt has an auditable state.
4. **Tenant isolation:** cross-workspace access tests pass.
5. **Evidence quality:** manual, system, and provider analytics are labeled distinctly; unsupported provider metrics are not presented as live.
6. **Cost control:** token/model costs and platform costs are recorded; workspace budgets are enforced server-side.
7. **Reliability:** critical workflow E2E tests pass, with a documented recovery path for ambiguous publishing outcomes.
8. **Supportability:** customer-facing status, error messages, incident contact, and data export/deletion procedures are documented.

## Commercial validation

For each pilot, record: buyer role, monthly content volume, number of brands/platforms, current team hours, baseline cost, expected saved hours, approval rate, publish success rate, retention intent, willingness-to-pay evidence, and support burden.

Do not promise a Rp30M/month price solely because the feature list is large. The price should be supported by measurable business outcomes, multi-brand/workspace governance, reliability, and service-level expectations.

## Tiering hypothesis to validate

- **Starter:** limited brands and content volume, assisted content workflow.
- **Growth:** multi-brand campaigns, approval workflow, usage visibility, and supported publishing.
- **Enterprise:** governance, audit evidence, higher limits, support commitments, and integrations proven in the customer environment.

Payment-provider selection, tax/invoice handling, refund policy, and subscription lifecycle integration remain implementation decisions and must be tested before paid self-service launch.
