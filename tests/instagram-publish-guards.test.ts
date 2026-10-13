import { describe, expect, it } from "vitest";
import { isPublishableInstagramImageDraft, isPublicHttpsMediaUrl, isSocialTokenExpired } from "../lib/instagram-publish-guards";

describe("Instagram publishing guards", () => {
  it("requires an approved-flow generated image URL and Instagram target", () => {
    expect(isPublishableInstagramImageDraft({ caption: "hello", platform: "Instagram", media_status: "generated", media_url: "https://cdn.example.com/image.jpg" })).toBe(true);
    expect(isPublishableInstagramImageDraft({ caption: "hello", platform: "LinkedIn", media_status: "generated", media_url: "https://cdn.example.com/image.jpg" })).toBe(false);
    expect(isPublishableInstagramImageDraft({ caption: "hello", platform: "Instagram", media_status: "pending", media_url: "https://cdn.example.com/image.jpg" })).toBe(false);
    expect(isPublishableInstagramImageDraft({ caption: " ", platform: "Instagram", media_status: "generated", media_url: "https://cdn.example.com/image.jpg" })).toBe(false);
  });

  it("accepts only HTTPS media URLs without embedded credentials or local hosts", () => {
    expect(isPublicHttpsMediaUrl("https://cdn.example.com/image.jpg")).toBe(true);
    expect(isPublicHttpsMediaUrl("http://cdn.example.com/image.jpg")).toBe(false);
    expect(isPublicHttpsMediaUrl("https://user:pass@cdn.example.com/image.jpg")).toBe(false);
    expect(isPublicHttpsMediaUrl("https://localhost/image.jpg")).toBe(false);
    expect(isPublicHttpsMediaUrl("not a url")).toBe(false);
  });

  it("fails closed for invalid or expired token timestamps", () => {
    expect(isSocialTokenExpired(null, 1_000)).toBe(true);
    expect(isSocialTokenExpired("not-a-date", 1_000)).toBe(true);
    expect(isSocialTokenExpired("1970-01-01T00:00:02.000Z", 1_000)).toBe(false);
    expect(isSocialTokenExpired("1970-01-01T00:00:01.000Z", 1_000)).toBe(true);
  });
});
