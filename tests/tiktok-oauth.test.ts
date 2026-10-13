import { describe, expect, it } from "vitest";
import { isSocialTokenExpired } from "../lib/instagram-publish-guards";

describe("TikTok OAuth token expiry guard", () => {
  it("fails closed for missing, malformed, or expired access-token timestamps", () => {
    expect(isSocialTokenExpired(null, 1000)).toBe(true);
    expect(isSocialTokenExpired("not-a-date", 1000)).toBe(true);
    expect(isSocialTokenExpired("1970-01-01T00:00:00.500Z", 1000)).toBe(true);
  });

  it("accepts a future expiry and rejects the exact boundary", () => {
    expect(isSocialTokenExpired("1970-01-01T00:00:02.000Z", 1000)).toBe(false);
    expect(isSocialTokenExpired("1970-01-01T00:00:01.000Z", 1000)).toBe(true);
  });
});
