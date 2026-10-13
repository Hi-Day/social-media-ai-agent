import { describe, expect, it } from "vitest";
import { isSubscriptionActive } from "../lib/billing-entitlements";

describe("subscription entitlement", () => {
  it("grants paid entitlement only for verified active status", () => {
    expect(isSubscriptionActive("active")).toBe(true);
    expect(isSubscriptionActive("pending")).toBe(false);
    expect(isSubscriptionActive("past_due")).toBe(false);
    expect(isSubscriptionActive("inactive")).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
