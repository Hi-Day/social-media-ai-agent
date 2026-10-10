# TikTok integration foundation and release gates

## Implemented in this change
- Workspace owner/admin-gated TikTok OAuth start and callback.
- OAuth state validation via short-lived HTTP-only cookies.
- Access and refresh tokens encrypted before database persistence.
- Connection listing/disconnect endpoints.
- Explicit refresh-token endpoint that updates encrypted tokens and expiry timestamps.
- Shared provider constraints include TikTok, LinkedIn, and Instagram.

## Server-side environment
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI` — exact callback URL `/api/integrations/tiktok/callback`
- Existing `SOCIAL_TOKEN_ENCRYPTION_KEY` (base64-encoded 32-byte key)

Register the callback URL in the TikTok developer app and request only the scopes approved for the app. The OAuth scope list in code currently requests `user.info.basic,video.publish,video.upload`; verify these are enabled for the registered app before testing.

## Not production-ready yet
- Video upload and Direct Post publishing are intentionally not implemented in this change.
- TikTok Direct Post API requires the app and scopes to be approved; unaudited clients are restricted to private-only posts and other usage limits.
- Before enabling public posting, implement creator-info lookup, user-selected privacy/interaction settings, explicit consent, media validation/upload, post-status polling, and TikTok audit requirements.
- Analytics ingestion and scheduled publishing are not implemented.
- Run the migration only through the normal PR-based migration workflow. Test OAuth and token refresh using a dedicated authorized test account before customer access.

## Official references
- TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started/
- Direct Post API: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/
- Content Sharing Guidelines: https://developers.tiktok.com/doc/content-sharing-guidelines/
