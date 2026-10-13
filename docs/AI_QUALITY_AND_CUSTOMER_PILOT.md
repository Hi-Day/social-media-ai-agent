# AI Quality Evaluation and Customer Pilot Plan

## Objective
Measure whether the agent produces useful, on-brand, platform-appropriate content and saves enough operator time to justify a paid subscription. A higher number of observations alone is not evidence of improved quality.

## Offline evaluation set
Build a versioned set of representative briefs across:
- brand/product announcements;
- educational and thought-leadership content;
- promotional campaigns;
- community engagement;
- multiple tones, audiences, and platform formats.

Remove personal/customer-sensitive data or obtain permission. Store the expected brand constraints and disallowed claims alongside each brief.

## Review rubric
Score each generated item from 1–5 on:
1. Brief adherence.
2. Brand voice and audience fit.
3. Platform format and length fit.
4. Specificity and usefulness.
5. Factual grounding / unsupported claims.
6. Safety, privacy, and policy compliance.
7. Editing effort required before approval.

A factual or safety failure should be recorded separately and cannot be hidden by a high average score. Have at least two reviewers independently score a sample and resolve rubric disagreements.

## Baseline comparison
Compare:
- baseline prompt/model configuration;
- current modular agent/harness configuration.

Keep briefs, model budget, and review instructions constant. Report mean/median scores, severe failure count, reviewer agreement, latency, token usage, estimated cost per approved asset, and human editing time. Report uncertainty and examples of regressions; do not claim statistically significant improvement without an appropriate analysis.

## Learning-loop guardrails
- Separate raw observations from accepted feedback.
- Exclude duplicate, malformed, low-confidence, or untrusted feedback.
- Keep a versioned evaluation set that is not automatically trained on.
- Require offline evaluation before changing default prompts, model routing, or scoring.
- Support rollback to the previous known-good configuration.
- Never use one customer's private content or feedback to improve another tenant's output without explicit consent and a documented policy.

## Customer pilot
Recruit 3–5 design partners for a time-boxed pilot. For each participant, record:
- current workflow and baseline time per approved asset;
- campaigns/assets produced and approval rate;
- average editing time and revision count;
- model/provider costs and estimated gross margin;
- user-reported usefulness and willingness to pay;
- failure reports and support time.

Use a clear consent/data-retention statement and an easy way to delete pilot data.

## Go/no-go criteria
Agree on thresholds before reviewing results. At minimum:
- no unresolved cross-tenant data exposure;
- no critical security or unsafe-publishing defects;
- content quality is at least non-inferior to the baseline on agreed rubric;
- measurable reduction in time-to-approved-content for pilot workflows;
- unit economics remain viable at expected usage;
- at least some pilot users express credible willingness to pay at the proposed price.

Publish findings internally with limitations and a list of regressions. Do not market pilot results as independently validated unless they were independently validated.