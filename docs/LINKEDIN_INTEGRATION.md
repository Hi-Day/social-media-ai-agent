# LinkedIn integration (initial release)

Supports workspace-admin OAuth connection, encrypted access-token storage, connection status/disconnect, and publishing an already-approved text draft to a LinkedIn member feed. Image/video publishing, token refresh, and LinkedIn analytics are not implemented yet.

## Required server-side environment variables

- LINKEDIN_CLIENT_ID
- LINKEDIN_CLIENT_SECRET
- LINKEDIN_REDIRECT_URI — exact callback URL registered in LinkedIn, e.g. https://YOUR_APP_DOMAIN/api/integrations/linkedin/callback
- SOCIAL_TOKEN_ENCRYPTION_KEY — base64 encoding of exactly 32 random bytes. Generate locally with: openssl rand -base64 32. Do not commit or send this value in chat.
- Optional LINKEDIN_API_VERSION — a currently supported LinkedIn API version in YYYYMM form.

In LinkedIn's developer portal, enable Sign In with LinkedIn using OpenID Connect and the Share on LinkedIn/member posting product. Request openid, profile, and w_member_social scopes. Posting access may require LinkedIn product approval.

## Endpoints

- GET /api/integrations/linkedin/connect?workspaceId=... — authenticated workspace owner/admin; redirects to LinkedIn OAuth.
- GET /api/integrations/linkedin/callback — validates a short-lived HttpOnly state cookie, exchanges the code, fetches the profile, and stores an AES-256-GCM encrypted token.
- GET /api/integrations/linkedin/connections?workspaceId=... — lists metadata only.
- DELETE /api/integrations/linkedin/connections with JSON { "workspaceId": "...", "connectionId": "..." } — disconnects an account.
- POST /api/integrations/linkedin/publish with JSON { "workspaceId": "...", "draftId": "..." } — publishes an approved draft as a public text post.

Only workspace owners/admins can connect, inspect, disconnect, or publish. The publish endpoint enforces approval server-side. Provider errors are sanitized.

## Before production use

1. Apply migration 20261009001200_linkedin_social_connections.sql.
2. Configure secrets in Vercel and register the exact callback URI.
3. Verify LinkedIn app product permissions and the current API version in LinkedIn's developer portal.
4. Test with a dedicated LinkedIn test account and a non-sensitive approved draft.
5. Confirm the post ID and post in LinkedIn. CI does not validate live provider access.
6. Plan token re-encryption before rotating SOCIAL_TOKEN_ENCRYPTION_KEY; changing it without re-encrypting stored values makes existing tokens unreadable.
