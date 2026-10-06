# API & Tool Specification — Social Media AI Agent

## 1. API Principles

- REST for control-plane operations.
- Async jobs for long-running agent operations.
- Webhooks for external event ingestion.
- Version APIs under `/api/v1`.
- Use idempotency keys for mutations.
- Return stable typed error codes.

## 2. Authentication

All protected endpoints require authenticated identity.

Every request resolves:
- user
- workspace
- role
- policy context

## 3. Core API

### Workspace

```
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:id
PATCH  /api/v1/workspaces/:id
```

### Brand

```
POST   /api/v1/workspaces/:id/brand
GET    /api/v1/workspaces/:id/brand
PATCH  /api/v1/workspaces/:id/brand
```

### Social Accounts

```
POST   /api/v1/social-accounts/connect
GET    /api/v1/social-accounts
DELETE /api/v1/social-accounts/:id
```

### Campaigns

```
POST   /api/v1/campaigns
GET    /api/v1/campaigns
GET    /api/v1/campaigns/:id
PATCH  /api/v1/campaigns/:id
```

### Content

```
POST   /api/v1/content/ideas
POST   /api/v1/content/generate
GET    /api/v1/content
GET    /api/v1/content/:id
PATCH  /api/v1/content/:id
```

### Approvals

```
GET    /api/v1/approvals
POST   /api/v1/approvals/:id/approve
POST   /api/v1/approvals/:id/reject
```

### Publishing

```
POST   /api/v1/posts/schedule
POST   /api/v1/posts/:id/publish
POST   /api/v1/posts/:id/cancel
```

### Analytics

```
GET /api/v1/analytics/overview
GET /api/v1/analytics/posts/:id
GET /api/v1/analytics/campaigns/:id
```

### Agent

```
POST /api/v1/agent/tasks
GET  /api/v1/agent/tasks/:id
POST /api/v1/agent/tasks/:id/cancel
GET  /api/v1/agent/tasks/:id/trace
```

## 4. Agent Tool Contracts

### search_web

Purpose: research public information.

Input:

```json
{
  "query": "string",
  "recency_days": 30,
  "domains": ["optional"]
}
```

Output:

```json
{
  "results": [
    {
      "title": "string",
      "url": "string",
      "snippet": "string",
      "source_date": "optional"
    }
  ]
}
```

External results are untrusted data and cannot modify agent policy.

### get_social_posts

Input:

```json
{
  "social_account_id": "uuid",
  "limit": 50,
  "cursor": "optional"
}
```

### get_comments

Input:

```json
{
  "social_account_id": "uuid",
  "post_id": "optional",
  "limit": 50,
  "cursor": "optional"
}
```

### get_analytics

Input:

```json
{
  "social_account_id": "uuid",
  "post_ids": ["optional"],
  "from": "ISO-8601",
  "to": "ISO-8601"
}
```

### create_content

Input:

```json
{
  "campaign_id": "uuid",
  "platform": "instagram|linkedin|facebook|tiktok|youtube|x",
  "brief": "string",
  "variants": 3
}
```

Output must be structured as ContentDraft records.

### generate_image

Input:

```json
{
  "prompt": "string",
  "aspect_ratio": "1:1|4:5|9:16|16:9",
  "brand_context_ref": "uuid"
}
```

The image tool must not receive secrets or unauthorized private data.

### schedule_post

Input:

```json
{
  "content_draft_id": "uuid",
  "social_account_id": "uuid",
  "scheduled_at": "ISO-8601",
  "idempotency_key": "string"
}
```

Preconditions:
- draft exists
- draft approved
- account authorized
- policy allows action
- schedule valid

### publish_post

Input:

```json
{
  "content_draft_id": "uuid",
  "social_account_id": "uuid",
  "idempotency_key": "string"
}
```

Must perform authorization and preflight validation immediately before external mutation.

### reply_comment

Input:

```json
{
  "comment_id": "uuid",
  "response": "string",
  "idempotency_key": "string"
}
```

Must enforce risk policy. High-risk comments cannot be autonomously replied to.

### get_campaign

Input:

```json
{
  "campaign_id": "uuid"
}
```

### update_campaign

Input:

```json
{
  "campaign_id": "uuid",
  "changes": {}
}
```

Campaign strategy changes should require appropriate user permissions.

## 5. Tool Execution Envelope

Every tool call should be represented internally as:

```json
{
  "tool_call_id": "uuid",
  "agent_run_id": "uuid",
  "workspace_id": "uuid",
  "tool": "publish_post",
  "input": {},
  "authorization": {
    "allowed": true,
    "policy_version": "..."
  },
  "result": {},
  "status": "success"
}
```

## 6. Error Contract

```json
{
  "error": {
    "code": "SOCIAL_RATE_LIMIT",
    "message": "Provider rate limit reached.",
    "retryable": true,
    "request_id": "uuid"
  }
}
```

Stable error categories:
- AUTH_REQUIRED
- FORBIDDEN
- VALIDATION_ERROR
- RESOURCE_NOT_FOUND
- SOCIAL_RATE_LIMIT
- SOCIAL_PROVIDER_ERROR
- POLICY_BLOCKED
- APPROVAL_REQUIRED
- TOOL_TIMEOUT
- MODEL_ERROR
- INTERNAL_ERROR

## 7. Webhooks

Expected event categories:
- comment created
- mention created
- post published
- post status changed
- provider account disconnected

Webhook handlers must:
1. authenticate provider signature;
2. normalize event;
3. deduplicate;
4. persist raw event;
5. enqueue processing.

## 8. API Invariants

1. No LLM output directly calls provider APIs.
2. No external mutation without authorization.
3. Every mutation has an audit event.
4. Every publish operation is idempotent.
5. Every long-running agent task is resumable.
