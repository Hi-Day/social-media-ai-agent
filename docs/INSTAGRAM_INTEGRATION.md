# Instagram integration status and rollout

## Implemented in this change
- Workspace owner/admin-gated Instagram OAuth start route.
- OAuth state stored in short-lived, HTTP-only cookies and verified on callback.
- Authorization-code exchange followed by long-lived token exchange.
- Profile lookup and encrypted token persistence through the existing social-connections table.
- Workspace-scoped connection listing and disconnect endpoints.
- Shared provider constraints expanded to allow `instagram` for connections and publication audit rows.

## Environment
Configure these server-only variables in local development and the deployment platform:
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI` — exact callback URL: `/api/integrations/instagram/callback`
- `SOCIAL_TOKEN_ENCRYPTION_KEY` — existing base64-encoded 32-byte key used for encrypted social tokens.

Register the callback URL in the Meta developer app. The Meta app must have the Instagram API with Instagram Login product configured and request the scopes used by the integration.

## Not production-ready yet
- Publishing is **not implemented** by this change. It requires a separate, tested media-upload/container/publish workflow with approved-draft checks, idempotency, public media URL validation, status polling, and audit updates.
- Insights ingestion and scheduled publishing are not implemented.
- Meta app review / Advanced Access may be required before connecting customer accounts outside app roles/testers. Confirm the current requirements in Meta's official developer dashboard and documentation.
- Run the migration through the normal PR-based migration workflow before deploying routes that use the new provider value.
- Test OAuth and token refresh/expiry with a dedicated Instagram Professional test account before enabling customers.

## Official references
- Meta Instagram API collection: https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00
- Instagram Login API collection: https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-instagram-login
- Content publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
