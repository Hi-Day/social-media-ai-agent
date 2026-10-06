# Free-Tier Deployment Architecture

**Status:** Required MVP constraint
**Target:** A $0/month development/pilot deployment with a clean migration path to paid production infrastructure.

## 1. MVP platform

- **Vercel Hobby** for Next.js web/API workloads.
- **Supabase Free** for PostgreSQL, Auth, Storage, pgvector, and Postgres-native queues.
- **GitHub Actions** for CI.
- **External LLM APIs** for inference; model usage is not assumed to be free.

The MVP MUST NOT require a permanently running VM, Docker host, Redis instance, Kubernetes cluster, or paid worker service.

Vercel Hobby is intended for personal/non-commercial use under its current terms, so the $0 deployment is explicitly a development/pilot environment rather than the commercial production target. citeturn0search6turn1search13

## 2. MVP topology

```text
Vercel Hobby
  ├── Next.js Web
  ├── API routes
  └── serverless agent/job endpoints
          │
          ▼
Supabase Free
  ├── PostgreSQL + pgvector
  ├── Auth
  ├── Storage
  └── PGMQ / Supabase Queues
          │
          ├── LLM APIs
          ├── Social APIs
          └── Search APIs
```

## 3. Remove Redis from MVP

Earlier architecture documents listed Redis/BullMQ. That is now a **production option**, not an MVP dependency.

Supabase Queues is a Postgres-native durable queue built on PGMQ, so background work can be persisted without operating a separate queue server. citeturn1search1turn1search4

The application must depend on an abstraction:

```ts
interface JobQueue {
  enqueue<T>(job: Job<T>): Promise<JobId>;
  claim<T>(queue: string, options?: ClaimOptions): Promise<Job<T> | null>;
  ack(jobId: JobId): Promise<void>;
  retry(jobId: JobId, delaySeconds: number): Promise<void>;
  deadLetter(jobId: JobId, reason: string): Promise<void>;
}
```

Implementations:

```text
MVP        -> SupabasePgmqQueue
Production -> RedisBullMqQueue or ManagedQueueAdapter
```

## 4. Serverless-safe Agent Runtime

The Agent Runtime MUST be stateless between requests. Durable state belongs in PostgreSQL:

- AgentTask
- AgentRun
- ToolCall
- checkpoints
- approval state
- retry state
- job state

Do not depend on process memory, local filesystem persistence, singleton in-memory queues, long-lived Node processes, or background threads.

Long-running tasks must be resumable from a persisted checkpoint.

## 5. Job execution

Short operations may run synchronously in Vercel Functions:

- content generation
- strategy generation
- policy evaluation
- previews
- approval decisions
- dashboard APIs

Long-running operations create a durable job and return a task ID. A serverless job-drain endpoint claims a bounded number of jobs, processes them within the function execution budget, persists checkpoints, then acknowledges or retries them.

Every drain invocation must be safe to run repeatedly.

## 6. Scheduling constraint

Do not make Vercel Hobby Cron a minute-level scheduler. Current Vercel documentation limits Hobby cron to once per day and gives hour-level timing precision. citeturn1search0turn1search6

Therefore the database remains the source of truth for scheduled posts. The scheduler selects approved posts whose `scheduled_at` has passed and uses locking/idempotency to prevent duplicate publication.

For a pilot that requires exact minute-level publishing, use a replaceable external scheduler/worker. When production infrastructure is introduced, move scheduling to a persistent worker without changing domain logic.

## 7. Supabase Free constraints

Current Supabase Free quotas include 500 MB database size per project, 1 GB file storage, 5 GB egress, 50,000 MAU, and 500,000 Edge Function invocations. Free projects can also be paused after inactivity. citeturn0search0turn0search10

Supabase Free projects become read-only when database usage exceeds the 500 MB database quota. citeturn0search3

Therefore the MVP MUST:

- keep binary media out of PostgreSQL;
- store media in Supabase Storage;
- retain metadata rather than raw high-volume social payloads where possible;
- aggregate analytics;
- implement retention/cleanup policies;
- expose database, storage, and queue usage metrics.

## 8. Production migration

```text
Stage 0 — $0 pilot
Vercel Hobby + Supabase Free + PGMQ

Stage 1 — small production
Vercel Pro + Supabase Pro + PGMQ

Stage 2 — growing workload
Vercel + Supabase Pro + Redis/BullMQ + dedicated worker

Stage 3 — high scale
CDN + API services + dedicated agent workers + queue cluster + Postgres scaling + analytics warehouse
```

The domain model, API contracts, tool contracts, agent contracts, and queue/scheduler interfaces must remain stable across these stages.

## 9. Free-tier acceptance test

A clean MVP deployment must require only:

```text
Vercel account
Supabase account
GitHub repository
LLM provider API key
```

No AWS account, Docker server, Redis server, Kubernetes cluster, or paid worker is required.

## 10. Non-negotiable rules

1. No Redis dependency in MVP.
2. No always-on server dependency.
3. No local filesystem persistence.
4. No in-memory task state.
5. Long-running work is checkpointed.
6. External mutations are idempotent.
7. External mutations are audited.
8. PostgreSQL is the durable source of truth.
9. Media uses object storage.
10. Queue and scheduler implementations are replaceable.
11. Provider credentials remain server-side.
12. Usage quotas are observable.

> **Free-tier deployment is a deployment mode, not a separate codebase.**