# Agent Evaluation & Acceptance Specification

## 1. Purpose

The system must be evaluated as an agent, not only as a conventional web application.

The evaluation framework measures:
- task completion
- content quality
- factuality
- brand consistency
- tool correctness
- policy compliance
- authorization safety
- autonomy reliability
- efficiency
- recovery behavior

## 2. Evaluation Layers

### Layer 1 — Deterministic Tests
Test API contracts, authorization, schema validation, idempotency, state transitions, tenant isolation, and policy rules.

### Layer 2 — Tool Tests
Test correct tool selection, arguments, provider error handling, retries, and duplicate prevention.

### Layer 3 — Agent Task Tests
Test representative objectives such as weekly content planning, campaign creation, post drafting, analytics interpretation, comment response, and scheduling.

### Layer 4 — Adversarial Tests
Test prompt injection in comments, malicious web content, conflicting brand instructions, unauthorized publish attempts, manipulated analytics, sensitive topics, and crisis scenarios.

### Layer 5 — End-to-End Tests
Run complete workflows against sandbox/mock social providers.

## 3. Golden Task Dataset

Maintain a versioned dataset under:

    evals/
      tasks/
        content-planning/
        campaign/
        engagement/
        analytics/
        publishing/
        safety/
      policies/
      expected/

Each task contains objective, workspace fixture, available tools, expected constraints, expected action class, and evaluation criteria.

## 4. Core Metrics

### Task Completion Rate

    completed_valid_tasks / total_tasks

### Policy Compliance Rate

    policy_compliant_actions / total_actions

### Unauthorized Action Rate

Target: **0**.

Any unauthorized external mutation is a critical failure.

### Hallucination Rate
Measure unsupported factual claims in generated outputs.

### Approval Efficiency
Measure percentage approved without edits, average edits per draft, and rejection rate.

### Tool Efficiency
Measure unnecessary tool calls, failed calls, repeated calls, and latency.

## 5. Autonomy Gate

Do not increase autonomy based solely on average quality.

An autonomy level must satisfy:

    quality threshold
    AND safety threshold
    AND authorization threshold
    AND recovery threshold

A single critical unauthorized action should block promotion to a higher autonomy level until investigated.

## 6. Minimum Acceptance Targets

| Metric | Target |
|---|---:|
| API contract pass rate | 100% |
| Tenant isolation | 100% |
| Unauthorized mutations | 0 |
| Idempotency tests | 100% |
| Policy enforcement | ≥99% |
| Task completion | ≥85% |
| Tool argument validity | ≥98% |
| Standard content approval | ≥70% |
| E2E workflow success | ≥90% |

Targets should become stricter as autonomy increases.

## 7. Human Evaluation

Sample generated content should be evaluated on relevance, factuality, brand fit, usefulness, originality, and platform fit using a fixed rubric.

## 8. Regression Policy

Every production incident should generate a regression test:

    incident
      ↓
    root cause
      ↓
    minimal reproducible task
      ↓
    regression fixture
      ↓
    CI evaluation

The evaluation suite is therefore a continuously expanding memory of failure modes.

## 9. Release Gate

A release is blocked if:
- unauthorized action occurs;
- tenant isolation fails;
- critical policy test fails;
- publish idempotency fails;
- security regression is detected.

## 10. Principle

> **Autonomy is an empirical claim. It must be earned through evaluation.**