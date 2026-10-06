# SocialOS — Social Media AI Agent

Agentic AI workspace for planning, creating, approving, publishing and learning from social media operations.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The app works in **demo mode without Supabase or an LLM key**. Add `OPENROUTER_API_KEY` to enable live generation.

## Free-tier deployment

Designed for Vercel Hobby + Supabase Free. Redis is not required for MVP. See [Free-Tier Deployment Architecture](docs/FREE_TIER_DEPLOYMENT.md).

## Documentation

- [PRD](docs/PRD.md)
- [System Design](docs/SYSTEM_DESIGN.md)
- [Agent Architecture](docs/AGENT_ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [API & Tool Spec](docs/API_TOOL_SPEC.md)
- [Evaluation](docs/EVALUATION.md)
