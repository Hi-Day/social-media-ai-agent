# Production Release Smoke Checklist

Use this checklist for each production release. A successful build alone is not proof that the product is ready for customers.

## Pre-deploy

- [ ] Pull request is reviewed; CI typecheck, unit tests, and production build pass.
- [ ] All Supabase migrations are committed and reviewed; no manual schema changes are required.
- [ ] Required Vercel environment variables are present in the intended environment; secrets are never pasted into issues or chat.
- [ ] Authentication redirect URLs and cookie/session behavior match the production hostname.
- [ ] LinkedIn OAuth app has the required product access, scopes, and exact redirect URI.
- [ ] Usage budget and hard-limit RPCs are present in the target database.

## Post-deploy smoke tests

- [ ] Home/login page loads over HTTPS and expected security headers are present.
- [ ] A new user can sign up, verify email, sign in, and sign out.
- [ ] Demo/anonymous auth works only when explicitly enabled.
- [ ] A user cannot read or mutate another workspace's campaigns, content, observations, connections, or usage records.
- [ ] Campaign generation records model usage and respects configured budget enforcement.
- [ ] Approval is required before publishing; unauthorized users cannot approve.
- [ ] LinkedIn connect/disconnect works with an authorized test account.
- [ ] Publish a clearly labeled test post; verify the post in LinkedIn before calling the flow successful.
- [ ] Ambiguous provider/network outcomes enter a manual verification state and do not blindly retry.
- [ ] Analytics clearly distinguishes manual, system, and provider observations.
- [ ] Billing/usage limits block over-budget generation on the server, not only in the UI.
- [ ] Error logs include correlation/request context but do not contain access tokens, prompts with sensitive data, or credentials.

## Release evidence

Record release SHA, Vercel deployment URL/ID, migration status, smoke-test operator/date, failed checks, and rollback decision. Mark provider publishing and analytics as **not verified** until exercised against a real authorized account. Do not use mock data as evidence of production integration.

## Rollback triggers

Rollback or disable the affected feature if tenant isolation fails, a secret is exposed, a publish action duplicates unexpectedly, budget hard limits can be bypassed, or authentication breaks for existing users.
