# Subscription Billing Lifecycle

This is an implementation specification. No payment provider or live paid checkout is considered enabled by this document alone.

## Decisions required before implementation
- Select payment provider based on Indonesian business availability, supported payment methods, fees, settlement, refunds, and recurring billing support.
- Decide whether plans are monthly subscription, prepaid usage credits, or a hybrid.
- Define tax/invoice ownership and customer-support/refund process.
- Keep provider secrets server-side and separate sandbox from production credentials.

## Minimum lifecycle
1. **Checkout initiated** — create a server-side checkout session for an allowed plan and authenticated workspace.
2. **Pending** — do not grant paid entitlements based solely on a browser redirect.
3. **Active** — grant plan entitlements only after a verified provider webhook or server-side confirmation.
4. **Payment failed / past due** — apply a documented grace period, restrict new spend as appropriate, preserve user data, and show clear remediation.
5. **Cancellation scheduled** — retain entitlements through the paid-through timestamp when contractually appropriate.
6. **Canceled / expired** — downgrade entitlements according to policy without deleting customer data.
7. **Refund / dispute** — record provider event, update entitlement state, and flag manual review where needed.

## Security and correctness requirements
- Verify webhook signatures against the raw request body.
- Store provider event IDs and process them idempotently.
- Reject stale/out-of-order events using provider timestamps/versioning where available.
- Reconcile subscription state periodically with provider state.
- Never accept plan, price, credit balance, or entitlement claims from client input.
- Check entitlement and budget server-side on every billable operation.
- Keep an append-only billing/usage ledger; adjustments must be attributable.
- Separate provider payment state from internal entitlement state.
- Avoid storing card data; let the payment provider handle payment credentials.
- Add audit events for plan changes, cancellations, refunds, and admin overrides.

## Launch gates
- [ ] Sandbox checkout and signed webhook tests pass.
- [ ] Duplicate and out-of-order webhook tests pass.
- [ ] Failed payment, cancellation, renewal, and refund flows are tested.
- [ ] Server-side entitlements and spend limits cannot be bypassed via direct API calls.
- [ ] Pricing, included usage, overage behavior, tax/invoice workflow, and support policy are published.
- [ ] Production credentials and webhook endpoint are configured securely.
- [ ] A real low-value transaction and refund are verified before public launch, where feasible.

## Commercial validation
Do not set a plan price solely to reach a revenue target. Validate willingness to pay, gross margin, support burden, and retention with pilot customers. For a Rp30 million monthly revenue target, track number of paying accounts, average revenue per account, provider/model costs, payment fees, and churn.