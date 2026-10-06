# Social Media AI Agent

An agentic AI platform for managing social media operations end-to-end.

## Product thesis

**Observe → Understand → Plan → Create → Review → Act → Measure → Learn**

The goal is to evolve from an AI content generator into an AI Social Media Manager and ultimately an AI Marketing Operating System.

## Documentation

- [Product Requirements Document](docs/PRD.md)
- [System Design](docs/SYSTEM_DESIGN.md)
- [Free-Tier Deployment Architecture](docs/FREE_TIER_DEPLOYMENT.md)

## Initial MVP

- Brand Brain
- Social account connection
- Content planning
- AI content generation
- Content calendar
- Approval workflow
- Publishing
- Basic analytics
- Engagement monitoring
- AI recommendations

## Architecture principle

The system uses persistent context, tools, memory, planning, execution, evaluation, and governance, with risk-based human-in-the-loop controls.

## Deployment target

The MVP is designed to run first on **Vercel Hobby + Supabase Free**, without a permanently running server or Redis dependency. The queue and scheduler are abstracted so production infrastructure can be introduced later without rewriting the domain layer.

See [Free-Tier Deployment Architecture](docs/FREE_TIER_DEPLOYMENT.md).

## Status

Product definition / pre-development.
