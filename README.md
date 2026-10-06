# SocialOS — Social Media AI Agent

Agentic AI workspace for planning, creating, approving, publishing and learning from social media operations.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The dev server binds to all network interfaces, so you can also open it from another device on the same Wi-Fi using your computer's LAN IP, for example http://192.168.1.10:3000.

### Testing email verification from a phone

If you sign up from a phone, do not use `localhost:3000` in the verification redirect: on the phone, `localhost` points to the phone itself. Set `NEXT_PUBLIC_APP_URL` in `.env.local` to the LAN URL that your phone can reach, for example:

```env
NEXT_PUBLIC_APP_URL=http://192.168.1.10:3000
```

Then add the same URL with `/auth/callback` to Supabase Authentication → URL Configuration → Redirect URLs. Restart `npm run dev` after changing `.env.local`.

For Vercel, set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL instead of the LAN address.

The app works in **demo mode without Supabase or an LLM key**. Add `OPENROUTER_API_KEY` to enable live generation.

## Free-tier deployment

Designed for Vercel Hobby + Supabase Free. Redis is not required for MVP. See [Free-Tier Deployment Architecture](docs/FREE_TIER_DEPLOYMENT.md).

## Documentation

- [PRD](docs/PRD.md)
- [System Design](docs/SYSTEM_DESIGN.md)
- [Agent Architecture](docs/AGENT_ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [API & Tool Spec](docs/API_TOOL_SPEC.md)
- [Evaluation](docs/EVALUATION.md)


### Demo mode

The login page includes **Try Demo**, which uses Supabase Anonymous Auth so demo users still receive a real authenticated session and remain protected by the same workspace RLS policies. Enable **Authentication → Providers → Anonymous** in the Supabase project before using it. Demo sessions can be signed out normally; no shared demo password is exposed.
