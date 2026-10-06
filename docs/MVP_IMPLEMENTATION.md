# MVP Implementation

## Included

- Next.js App Router UI
- Overview dashboard
- AI Studio content generation workflow
- OpenRouter-compatible LLM gateway
- Demo fallback when no LLM key exists
- Supabase migration for workspace, brand, drafts, approvals, agent tasks, and audit events
- Vercel-ready deployment
- GitHub Actions typecheck/build

## Deliberate MVP boundary

Social provider OAuth/publishing adapters are not enabled yet. The UI models the approval-first workflow, while external mutations remain behind the future Tool Gateway.

## Local

Run npm install, copy .env.example to .env.local, then run npm run dev.

Without credentials, the app runs in demo mode. Add OPENROUTER_API_KEY to enable live generation.

## Supabase

Create a Supabase project and run supabase/migrations/001_initial.sql. Authentication/RLS policies and provider OAuth adapters are the next implementation layer.

## Vercel

Import the GitHub repository as a Next.js project. No Redis, worker VM, or Docker host is required for the current MVP. Configure OPENROUTER_API_KEY only when live AI generation is desired.
