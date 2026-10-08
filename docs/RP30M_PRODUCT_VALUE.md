# Rp30M/Month Product Value Architecture

## Product thesis

At the Rp30M/month tier, the product must sell **continuous marketing decision support and execution**, not AI-generated content volume.

The customer outcome is:

> The agent continuously understands the brand, detects what is happening, recommends what to do next, produces the required work, routes consequential actions for approval, measures outcomes, and learns from validated results.

## Value loop

```
Observe → Understand → Plan → Create → Govern → Approve → Act
   ↑                                                        ↓
   └──────────── Measure → Learn → Replan ─────────────────┘
```

## P0 capabilities

### 1. Persistent Agent Memory

Memory is separated into:

- semantic: stable brand facts and preferences;
- episodic: campaigns, decisions, approvals and outcomes;
- performance: validated patterns from measured content;
- policy: constraints and governance.

Generated speculation must not silently become durable brand truth.

### 2. Social / Performance Intelligence

The agent should transform raw metrics into findings:

- winners and underperformers;
- format and platform differences;
- audience response patterns;
- anomalies;
- content fatigue;
- experiment outcomes.

Every important finding should retain evidence and confidence.

### 3. Actionable Recommendations

Recommendations must contain:

- proposed action;
- rationale;
- supporting evidence;
- expected impact;
- risk;
- priority;
- lifecycle state.

The agent proposes; deterministic policy decides whether the action may execute.

### 4. Closed-loop Replanning

Validated performance findings must be able to influence the next campaign/content plan.

The product should demonstrate:

**measure → learn → change plan**, not merely **measure → display dashboard**.

## P1 capabilities

- social account ingestion;
- executive intelligence brief;
- experimentation engine;
- campaign-level attribution;
- proactive opportunity/risk detection;
- bounded autonomous low-risk actions.

## Explicit non-goals

Do not increase scope merely to justify pricing:

- generic chatbot;
- arbitrary integrations;
- large dashboard collections;
- autonomous high-risk publishing;
- many model providers;
- billing complexity before customer validation.

## Rp30M acceptance bar

A customer should be able to give the system a business objective and receive:

1. evidence-backed strategy;
2. actionable campaign plan;
3. generated assets;
4. governed approval workflow;
5. measurable execution;
6. performance interpretation;
7. concrete next-step recommendations;
8. learning that changes subsequent decisions.

The strongest proof of value is therefore **decision quality and time saved**, not content count.
