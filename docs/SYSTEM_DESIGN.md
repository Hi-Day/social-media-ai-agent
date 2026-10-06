# System Design — Social Media AI Agent

**Version:** 1.0  
**Status:** Technical Baseline  
**Date:** October 2026

## 1. Purpose

This document translates the PRD into an implementation-oriented system architecture. It defines service boundaries, data flows, agent orchestration, persistence, security, observability, and deployment principles.

The architecture is intentionally modular: the first production version should be implementable as a modular monolith, while boundaries remain explicit enough to extract services later.

## 2. Architectural Principles

1. **Objective-oriented orchestration:** the agent receives goals, not only prompts.
2. **Deterministic control plane:** permissions, policies, approvals, scheduling, and publishing are deterministic.
3. **Probabilistic intelligence plane:** LLMs handle reasoning, generation, classification, and recommendations.
4. **Tool-mediated action:** agents never directly mutate external systems; all side effects go through validated tools.
5. **Evidence-first intelligence:** recommendations reference data/evidence where practical.
6. **Risk-based autonomy:** autonomy depends on action type, confidence, policy, and risk.
7. **Tenant isolation:** workspace is the primary security boundary.
8. **Observable execution:** every agent run and consequential tool call is traceable.
9. **Model independence:** LLM providers are behind an internal gateway.
10. **Human override:** users can interrupt, edit, reject, or revoke authorization.

## 3. High-Level Architecture

```
                         Web / Mobile Client
                                |
                         API / BFF Layer
                                |
                    +-----------+-----------+
                    |                       |
              Control Plane           Agent Runtime
                    |                       |
        +-----------+---------+       +-----+------+
        |           |         |       |            |
     Auth/RBAC   Workflow   Policy  Planner     Evaluator
        |           |         |       |            |
        +-----------+---------+       +-----+------+
                    |                       |
                    +-----------+-----------+
                                |
                           Tool Gateway
                                |
       +-------------+----------+----------+-------------+
       |             |                     |             |
   Social APIs   Web/Search            Content AI    Analytics
       |             |                     |             |
       +-------------+----------+----------+-------------+
                                |
                       Persistence Layer
       +----------------+----------------+----------------+
       | PostgreSQL     | Object Storage | Redis/Queue   |
       | + pgvector     | media/assets   | jobs/events   |
       +----------------+----------------+----------------+
                                |
                         Observability
                  traces / metrics / audit logs
```

## 4. Logical Components

### 4.1 Web Application

Responsibilities:
- workspace management
- brand configuration
- content calendar
- approval queue
- campaign management
- analytics dashboard
- agent chat
- audit/trace views

Recommended: Next.js + React + TypeScript.

### 4.2 API / BFF

Responsibilities:
- authentication/session validation
- request validation
- workspace authorization
- API aggregation
- rate limiting
- idempotency
- response shaping

Recommended: TypeScript/Node.js.

### 4.3 Control Plane

Owns deterministic business state:
- workspaces
- users/roles
- brands
- social accounts
- campaigns
- content
- approvals
- schedules
- policies

The control plane is authoritative for what the system is allowed to do.

### 4.4 Agent Runtime

Executes agent tasks.

Core stages:
1. task intake
2. context retrieval
3. planning
4. tool selection
5. execution
6. validation
7. evaluation
8. response/action
9. trace persistence

### 4.5 Tool Gateway

All external side effects pass through this layer.

Example tool categories:
- social read
- social publish
- comments
- analytics
- web research
- content generation
- scheduling

Tool calls require:
- schema validation
- authorization
- policy check
- timeout
- retry classification
- audit record

### 4.6 Knowledge Layer

Stores:
- brand facts
- tone/style rules
- product information
- audience descriptions
- campaign context
- policies
- historical content
- performance summaries

Use PostgreSQL as source of truth and pgvector for semantic retrieval initially.

### 4.7 Event / Job Layer

Use Redis + BullMQ initially.

Jobs include:
- scheduled publishing
- analytics sync
- comment ingestion
- social listening
- trend refresh
- agent task execution
- retry/dead-letter processing

### 4.8 Observability

Capture:
- request traces
- agent traces
- tool traces
- LLM latency
- token usage
- costs
- errors
- policy decisions
- approval transitions

## 5. Agent Runtime

### Supervisor

The Supervisor owns the task lifecycle. It should not perform every specialized task itself.

Responsibilities:
- interpret objective
- determine required capabilities
- create execution plan
- delegate
- enforce budget/time limits
- collect outputs
- invoke evaluator
- determine completion

### Strategy Agent

Inputs:
- objective
- brand context
- audience
- performance history
- campaign context

Outputs:
- strategy
- priorities
- content opportunities
- KPI recommendations

### Research Agent

Inputs:
- topic
- brand
- audience
- research constraints

Outputs:
- evidence
- trends
- competitor signals
- source metadata

### Content Agent

Inputs:
- strategy
- content brief
- platform
- brand voice

Outputs:
- content variants
- captions
- hooks
- CTAs
- creative briefs

### Engagement Agent

Inputs:
- comment/mention
- conversation context
- policy

Outputs:
- classification
- suggested response
- risk level

### Analytics Agent

Inputs:
- analytics snapshots
- historical baseline
- campaign goals

Outputs:
- insights
- anomalies
- recommendations

### Governance Agent

Responsibilities:
- policy evaluation
- risk scoring
- brand compliance
- action authorization
- approval routing

## 6. State Machine

Agent task states:

```
CREATED
  -> PLANNING
  -> EXECUTING
  -> VALIDATING
  -> WAITING_APPROVAL
  -> APPROVED
  -> ACTING
  -> COMPLETED

Alternative terminal states:
FAILED
CANCELLED
EXPIRED
BLOCKED
```

No external side effect should occur from an unapproved state when approval is required.

## 7. Risk-Based Action Model

Each action receives:

```
risk_score =
  action_risk
  + content_sensitivity
  + confidence_penalty
  + policy_penalty
```

Illustrative policy:

| Risk | Action |
|---|---|
| Low | Autonomous |
| Medium | User approval |
| High | Human-only |
| Critical | Block + escalation |

Risk classification must be deterministic enough to audit even if an LLM proposes the initial classification.

## 8. Context Assembly

Agent context should be layered:

```
System Policy
    +
Workspace Policy
    +
Brand Memory
    +
Campaign Context
    +
Task Context
    +
Retrieved Evidence
    +
Tool Results
```

Do not dump the entire database into prompts. Context must be selectively retrieved and budgeted.

## 9. Memory Strategy

### Semantic memory
Stable brand facts and policies.

### Episodic memory
Previous agent tasks, campaign decisions, and interactions.

### Performance memory
Aggregated content and campaign outcomes.

### Working memory
Current task context.

Memory writes should pass validation. The agent must not be allowed to silently promote arbitrary generated text into permanent brand truth.

## 10. Data Flow — Content Creation

```
User objective
   ↓
Supervisor
   ↓
Retrieve brand + audience + performance
   ↓
Strategy Agent
   ↓
Content brief
   ↓
Content Agent
   ↓
Governance validation
   ↓
Approval
   ↓
Scheduler
   ↓
Publishing Tool
   ↓
Social Platform
   ↓
Analytics ingestion
   ↓
Performance Memory
```

## 11. Data Flow — Engagement

```
Social platform
   ↓
Webhook/Polling
   ↓
Comment ingestion
   ↓
Classifier
   ↓
Risk + policy evaluation
   ↓
+--------------------------+
| Low risk → auto response |
| Medium → approval        |
| High → human escalation  |
+--------------------------+
   ↓
Response Tool
   ↓
Audit Trace
```

## 12. External Platform Adapter

Define an internal interface rather than coupling business logic to platform APIs.

Conceptual interface:

```ts
interface SocialPlatformAdapter {
  connect(): Promise<AccountConnection>;
  getProfile(): Promise<SocialProfile>;
  createPost(input: CreatePostInput): Promise<PostResult>;
  updatePost(input: UpdatePostInput): Promise<PostResult>;
  getComments(input: CommentQuery): Promise<Comment[]>;
  replyToComment(input: ReplyInput): Promise<ReplyResult>;
  getAnalytics(input: AnalyticsQuery): Promise<AnalyticsSnapshot>;
}
```

Each platform adapter translates internal contracts into provider-specific API calls.

## 13. Idempotency

Publishing must be idempotent.

Every publish request should carry an internal idempotency key.

If a network timeout occurs after the provider accepted a post, retry logic must first determine whether the operation already succeeded.

Never blindly retry a non-idempotent publish operation.

## 14. Scheduling

Store:
- scheduled_at UTC
- workspace timezone
- platform
- content version
- approval version
- publishing status

A scheduled item becomes invalid if its approved content version changes.

## 15. Security

### Authentication
Use OAuth/OIDC where possible.

### Authorization
RBAC + workspace-level policy.

### Secrets
Never expose social access tokens to the LLM.

### Tenant isolation
Every query must be scoped by workspace_id.

### Audit
All privileged actions must be immutable/auditable.

### Prompt injection
Treat external content, comments, web pages, and retrieved text as untrusted data.

## 16. Failure Handling

Categories:
- transient provider failure
- rate limit
- invalid request
- expired credential
- policy violation
- model failure
- tool timeout
- unknown execution failure

Transient failures use exponential backoff. Policy failures do not retry automatically.

Dead-letter jobs require explicit recovery.

## 17. LLM Gateway

All model calls go through an internal gateway.

Responsibilities:
- model routing
- fallback
- structured output validation
- token/cost accounting
- latency tracking
- prompt/version tracking
- provider abstraction

The application must not hard-code a single LLM provider.

## 18. Deployment

### MVP — Free-tier deployment

A serverless modular monolith:

```
Next.js / Vercel Hobby
   +
Serverless API + Agent Runtime
   +
Supabase PostgreSQL/pgvector
   +
Supabase Auth + Storage
   +
Supabase PGMQ / Queues
```

Redis/BullMQ is **not** an MVP dependency. The application uses a replaceable JobQueue interface, with Supabase PGMQ as the default implementation. This keeps the MVP deployable without an always-on server or paid queue. See [Free-Tier Deployment Architecture](FREE_TIER_DEPLOYMENT.md).

The Agent Runtime must be stateless between requests; long-running work is persisted as tasks, jobs, and checkpoints in PostgreSQL.

Vercel Hobby Cron must not be treated as a minute-level scheduler because Hobby cron is limited to once per day with hour-level timing precision. Exact scheduling is therefore abstracted behind a replaceable scheduler implementation. 

Deploy independently only when scale or organizational boundaries justify it.

### Production evolution

Extract:
- agent runtime
- ingestion workers
- publishing workers
- analytics pipeline

when load or reliability requirements justify the complexity.

## 19. SLO Baseline

- API availability: 99.9%
- dashboard p95: < 2s
- normal generation p95: < 15s
- queued publishing execution: > 99% within scheduling SLA
- no unauthorized external action
- every external mutation has an audit trace

## 20. Architectural Decision Records

Important decisions to document separately:
- modular monolith vs microservices
- workflow engine choice
- LLM provider strategy
- vector retrieval strategy
- social API abstraction
- event architecture
- multi-tenancy model
- observability stack

## 21. Implementation Sequence

1. Database + tenancy
2. Auth/RBAC
3. Brand Brain
4. LLM Gateway
5. Agent Runtime
6. Tool Gateway
7. Content workflow
8. Approval workflow
9. Social adapters
10. Publishing worker
11. Analytics ingestion
12. Engagement worker
13. Observability
14. Evaluation harness

## 22. Key Architectural Invariant

> **LLMs propose; deterministic systems authorize and execute.**

This invariant should remain true even as autonomy increases.
