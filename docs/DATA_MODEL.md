# Data Model — Social Media AI Agent

## 1. Persistence Strategy

Primary database: PostgreSQL.

Use UUIDs for externally visible entity identifiers.

Every tenant-owned entity must include `workspace_id`.

Use timestamps in UTC.

## 2. Core Entities

```
User
Workspace
Membership
Brand
Audience
SocialAccount
Campaign
ContentIdea
ContentAsset
ContentDraft
Approval
ScheduledPost
PublishedPost
Comment
Interaction
AnalyticsSnapshot
Experiment
AgentTask
AgentRun
ToolCall
Policy
Memory
AuditEvent
```

## 3. Entity Relationships

```
User
  |
Membership
  |
Workspace
  +-- Brand
  +-- Audience
  +-- SocialAccount
  +-- Campaign
  |     +-- ContentIdea
  |     +-- ContentDraft
  |     +-- ScheduledPost
  |     +-- PublishedPost
  +-- Comment
  +-- AnalyticsSnapshot
  +-- Experiment
  +-- AgentTask
  +-- Policy
  +-- Memory
  +-- AuditEvent
```

## 4. Suggested Schema

### users
- id
- email
- name
- created_at
- updated_at

### workspaces
- id
- name
- slug
- timezone
- created_at
- updated_at

### memberships
- id
- workspace_id
- user_id
- role
- created_at

Unique: (workspace_id, user_id)

### brands
- id
- workspace_id
- name
- description
- positioning
- voice_config JSONB
- visual_guidelines JSONB
- prohibited_topics JSONB
- created_at
- updated_at

### audiences
- id
- workspace_id
- name
- description
- attributes JSONB
- created_at
- updated_at

### social_accounts
- id
- workspace_id
- platform
- external_account_id
- display_name
- encrypted_credentials_ref
- status
- metadata JSONB
- created_at
- updated_at

Unique: (platform, external_account_id)

### campaigns
- id
- workspace_id
- brand_id
- name
- objective
- status
- start_at
- end_at
- metadata JSONB
- created_at
- updated_at

### content_ideas
- id
- workspace_id
- campaign_id
- title
- description
- pillar
- objective
- evidence JSONB
- score JSONB
- status
- created_at
- updated_at

### content_drafts
- id
- workspace_id
- campaign_id
- idea_id
- platform
- content JSONB
- asset_refs JSONB
- version
- status
- created_by
- created_at
- updated_at

### approvals
- id
- workspace_id
- content_draft_id
- requested_by
- reviewed_by
- status
- decision_reason
- created_at
- reviewed_at

### scheduled_posts
- id
- workspace_id
- social_account_id
- content_draft_id
- scheduled_at
- timezone
- idempotency_key
- status
- created_at
- updated_at

### published_posts
- id
- workspace_id
- social_account_id
- scheduled_post_id
- external_post_id
- published_at
- permalink
- metadata JSONB
- created_at

### comments
- id
- workspace_id
- published_post_id
- external_comment_id
- author_metadata JSONB
- text
- classification
- risk_level
- sentiment
- created_at

### interactions
- id
- workspace_id
- comment_id
- response_draft_id
- action
- status
- created_at

### analytics_snapshots
- id
- workspace_id
- social_account_id
- published_post_id
- captured_at
- metrics JSONB

### experiments
- id
- workspace_id
- campaign_id
- hypothesis
- variants JSONB
- metric
- status
- result JSONB
- created_at
- completed_at

### agent_tasks
- id
- workspace_id
- requested_by
- objective
- status
- autonomy_level
- budget JSONB
- result JSONB
- created_at
- completed_at

### agent_runs
- id
- workspace_id
- agent_task_id
- parent_run_id
- agent_type
- model
- prompt_version
- input_refs JSONB
- output JSONB
- risk_score
- status
- started_at
- completed_at

### tool_calls
- id
- workspace_id
- agent_run_id
- tool_name
- input JSONB
- output JSONB
- authorization_result JSONB
- status
- latency_ms
- created_at

### policies
- id
- workspace_id
- name
- policy_type
- rules JSONB
- version
- active
- created_at

### memories
- id
- workspace_id
- memory_type
- key
- content
- embedding
- source_type
- source_ref
- confidence
- approved
- created_at
- updated_at

### audit_events
- id
- workspace_id
- actor_type
- actor_id
- action
- resource_type
- resource_id
- metadata JSONB
- created_at

## 5. Indexing

Required:
- workspace_id on all tenant tables
- social account external identifiers
- scheduled_at + status
- published_at
- campaign status
- agent task status
- agent run task_id
- tool call run_id
- comments created_at
- analytics captured_at

Vector:
- HNSW/IVFFlat on memory embeddings after data volume justifies it.

## 6. Data Retention

Separate:
- operational data
- analytics data
- agent traces
- audit events

Retention should be configurable by plan and compliance requirements.

## 7. Sensitive Data

Social credentials should never be stored directly in ordinary JSON fields.

Store a secret reference to a dedicated secret manager.

LLM prompts must not contain raw access tokens.

## 8. Multi-Tenancy Invariant

Every read/write path must resolve:

```
authenticated_user
→ membership
→ workspace_id
→ resource
```

No endpoint may accept an arbitrary workspace_id without authorization verification.
