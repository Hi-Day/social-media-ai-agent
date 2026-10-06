# Agent Architecture — Social Media AI Agent

## 1. Objective

Define how autonomous reasoning is organized while preserving control, observability, and bounded authority.

## 2. Agent Topology

```
                         Supervisor
                              |
          +-------------------+-------------------+
          |                   |                   |
       Research            Strategy            Analytics
          |                   |                   |
          +-------------------+-------------------+
                              |
                          Content
                              |
                       Governance
                              |
                       Tool Gateway
                              |
                         External APIs
```

The Supervisor coordinates. Specialized agents solve bounded problems. Governance is a gate, not an optional advisor.

## 3. Supervisor Contract

Input:
- user objective
- workspace
- permissions
- available tools
- relevant context

Output:
- execution plan
- required approvals
- actions
- final result
- trace reference

The Supervisor must maintain a task budget:
- maximum turns
- maximum tool calls
- maximum cost
- maximum execution time

## 4. Planning

Plans should be explicit and structured.

Example:

```json
{
  "goal": "Prepare a weekly social content plan",
  "steps": [
    {"id": "research", "capability": "research"},
    {"id": "analyze", "capability": "analytics"},
    {"id": "strategy", "capability": "strategy"},
    {"id": "create", "capability": "content"},
    {"id": "validate", "capability": "governance"}
  ],
  "requires_approval": true
}
```

The planner may revise the plan when tool results invalidate assumptions, but every revision is traced.

## 5. Agent Contracts

Each specialized agent should expose:

```text
Input schema
Output schema
Allowed tools
Forbidden actions
Context requirements
Evaluation criteria
Failure modes
```

Example Content Agent:

Allowed:
- read brand memory
- read approved campaign
- generate content

Forbidden:
- publish
- delete content
- modify policies
- change permissions

## 6. Tool Authorization

Tool authorization is computed as:

```
Authorization =
  User Permission
  ∩ Workspace Policy
  ∩ Agent Capability
  ∩ Action Risk Policy
```

An agent gets the intersection, never the union.

## 7. Structured Outputs

All agent outputs that drive downstream execution must use typed schemas.

Examples:
- ContentDraft
- ResearchFinding
- StrategyPlan
- RiskAssessment
- ApprovalRequest
- PublishRequest
- AnalyticsInsight

Free-form LLM text should not directly trigger side effects.

## 8. Evaluation

Every significant agent task should be evaluated on:

### Task success
Did the requested objective get completed?

### Factuality
Are claims supported?

### Brand consistency
Does the output follow brand rules?

### Policy compliance
Did the agent violate any rule?

### Efficiency
How many steps/tool calls were required?

### Risk
Did the agent take an action beyond intended authority?

## 9. Self-Verification

Before consequential actions, the system should run a verification pass:

```
Generate
  ↓
Critique
  ↓
Verify evidence/policy
  ↓
Repair if needed
  ↓
Authorize
```

Self-verification must not replace deterministic governance.

## 10. Human-in-the-Loop

Approval requests should include:

- proposed action
- content preview
- rationale
- evidence
- risk level
- expected impact
- available alternatives

A user should be able to approve or reject without reading the entire agent trace.

## 11. Memory Write Policy

Agent-generated information enters persistent memory only when:
- explicitly user-provided;
- retrieved from an authoritative source;
- derived from validated system data;
- or explicitly approved.

Generated speculation must remain ephemeral.

## 12. Prompt Injection Defense

External text is always treated as untrusted.

Examples:
- comments
- posts
- web pages
- competitor content
- retrieved documents

External text can provide data, but cannot redefine system policy, permissions, or tool authority.

## 13. Long-Running Tasks

For tasks exceeding interactive latency:
- create AgentTask
- enqueue execution
- persist intermediate state
- expose progress
- resume from checkpoint
- notify user on completion or approval requirement

## 14. Agent Observability

Every run should have:

```
run_id
parent_run_id
workspace_id
agent
model
prompt_version
input_context_refs
tool_calls
tool_results
decisions
risk_scores
approval_events
token_usage
latency
final_output
error
```

## 15. Autonomy Levels

### L0 — Manual
AI only suggests.

### L1 — Copilot
AI creates drafts.

### L2 — Approval Agent
AI executes after approval.

### L3 — Bounded Autonomy
AI autonomously performs low-risk actions.

### L4 — Objective Autonomy
AI manages defined objectives within strict policy boundaries.

MVP target: **L1–L2**.

Phase 5 target: **L3**.

L4 should be introduced only after strong evaluation evidence.

## 16. Design Principle

> **Increase autonomy only after establishing evidence that the lower-autonomy level is reliable.**
