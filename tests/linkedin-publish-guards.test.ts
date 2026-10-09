import { describe, expect, it } from "vitest";
import { isPublishableLinkedInDraft, isSocialTokenExpired } from "../lib/linkedin-publish-guards";

describe("LinkedIn publish preconditions", () => {
  it("fails closed for missing, malformed, or expired token timestamps", () => {
    expect(isSocialTokenExpired(null, 1_000)).toBe(true);
    expect(isSocialTokenExpired("not-a-date", 1_000)).toBe(true);
    expect(isSocialTokenExpired("1970-01-01T00:00:00.500Z", 1_000)).toBe(true);
  });

  it("accepts a valid future expiry and rejects the exact expiry boundary", () => {
    expect(isSocialTokenExpired("1970-01-01T00:00:02.000Z", 1_000)).toBe(false);
    expect(isSocialTokenExpired("1970-01-01T00:00:01.000Z", 1_000)).toBe(true);
  });

  it("requires non-empty text and a LinkedIn target", () => {
    expect(isPublishableLinkedInDraft({ caption: "Post", platform: "linkedin" })).toBe(true);
    expect(isPublishableLinkedInDraft({ caption: "Post", platform: "multi-platform" })).toBe(true);
    expect(isPublishableLinkedInDraft({ caption: "  ", platform: "linkedin" })).toBe(false);
    expect(isPublishableLinkedInDraft({ caption: "Post", platform: "instagram" })).toBe(false);
    expect(isPublishableLinkedInDraft({ caption: null, platform: "linkedin" })).toBe(false);
  });
});
