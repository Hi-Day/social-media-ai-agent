# Production Release Recovery Checklist

Use this checklist for every release candidate. A green GitHub build or preview deployment is not evidence that production is healthy.

## 1. Release candidate identity
- [ ] Record the exact `main` commit SHA.
- [ ] Confirm required GitHub Actions checks passed for that SHA.
- [ ] Confirm database migration workflow completed successfully.
- [ ] Confirm no open release-blocking PR or failed required check remains.

## 2. Vercel deployment
- [ ] Check Vercel project deployment status and account/team build quota.
- [ ] If rate-limited, do not repeatedly trigger deployments; record the provider's retry window and retry once it expires.
- [ ] Keep the existing free-tier plan unless a project owner explicitly approves a cost/benefit review.
- [ ] Confirm the successful deployment is a **Production** deployment for the recorded SHA, not a Preview deployment.
- [ ] Record the production deployment URL and deployment identifier.

## 3. Environment configuration
Required app configuration:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or supported legacy anon key)
- `NEXT_PUBLIC_APP_URL` set to the canonical HTTPS production origin
- `OPENROUTER_API_KEY` only when live generation is enabled

LinkedIn publishing requires server-side configuration:
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `SOCIAL_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 random bytes)
- `LINKEDIN_API_VERSION`

Never add secrets to commits, issues, screenshots, or chat. Set them in the hosting provider's environment settings and redeploy after changes.

## 4. Production smoke checks
- [ ] Open the production root URL and login route.
- [ ] Confirm signup/login and email verification redirect to the production origin.
- [ ] Confirm an unauthenticated user cannot access workspace data.
- [ ] Confirm demo mode works only when Supabase Anonymous Auth is intentionally enabled.
- [ ] Generate one draft using a configured live model; confirm graceful, non-sensitive failure when the provider key is absent/invalid.
- [ ] Verify campaign creation, draft save/read, approval, and usage-budget enforcement.
- [ ] Verify LinkedIn publishing only with an authorized test account and a clearly labeled test post.
- [ ] Check server logs for errors without exposing access tokens or user content.
- [ ] Re-run Supabase Security Advisor and attach the findings to issue #37.

## 5. Rollback / stop criteria
Stop release and do not enable paid traffic if any of these occurs:
- tenant isolation or authentication checks fail;
- a migration fails or data integrity is uncertain;
- usage limits can be bypassed;
- publishing status is ambiguous and a retry could duplicate a post;
- provider analytics are shown as live despite lacking fresh provider evidence.

## Evidence to attach to release issue
Commit SHA, Production deployment URL/ID, UTC timestamp, smoke-check results, migration workflow result, and any remaining warnings. Redact tokens, user identifiers, and private content.