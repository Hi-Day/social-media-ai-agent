# Instagram integration status and rollout

## Implemented in this change
- Workspace owner/admin-gated Instagram Login OAuth start and callback routes.
- OAuth state stored in short-lived, HTTP-only cookies and verified on callback.
- Exchange short-lived tokens for long-lived tokens and encrypt tokens before storing them.
- Profile lookup and workspace-scoped connection listing/disconnect endpoints.
- Instagram single-image publishing for approved drafts whose media is marked generated and hosted at a public HTTPS URL.
- Duplicate-publication protection and audit records, including an `unknown` state when provider outcome is ambiguous.
- Shared provider constraints expanded to allow Instagram for connection and publication audit records.

## Environment
Configure these server-only variables in local development and the deployment platform:
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI` — exact callback URL: `/api/integrations/instagram/callback`
- `INSTAGRAM_GRAPH_API_VERSION` — optional, defaults to `v26.0`
- `SOCIAL_TOKEN_ENCRYPTION_KEY` — existing base64-encoded 32-byte key used for encrypted social tokens.

Register the callback URL in the Meta developer app. The Meta app must have the Instagram API with Instagram Login product configured and request the scopes used by the integration.

## Not production-ready yet
- Carousel and Reels publishing are not implemented by this change.
- Insights ingestion and scheduled publishing are not implemented.
- Meta app review / Advanced Access may be required before connecting customer accounts outside app roles/testers. Confirm current requirements in Meta's official developer dashboard and documentation.
- Run the migration through the normal PR-based migration workflow before deploying routes that use the new provider value.
- Test OAuth, token expiry, public media URL access, and a real test post with a dedicated Instagram Professional test account before enabling customers.

## Official references
- Meta Instagram API collection: https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00
- Instagram Login API collection: https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-instagram-login
- Content publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
