import { describe, expect, it } from "vitest";
import { analyticsDayBucket, normalizeLinkedInSocialActions } from "../lib/linkedin-analytics";

describe("LinkedIn analytics normalization", () => {
  it("preserves explicit zero values", () => {
    expect(normalizeLinkedInSocialActions({
      likesSummary: { totalLikes: 0 },
      commentsSummary: { totalFirstLevelComments: 0 },
    })).toEqual({ likes: 0, comments: 0 });
  });

  it("does not fabricate zero for missing or malformed summaries", () => {
    expect(normalizeLinkedInSocialActions({})).toEqual({});
    expect(normalizeLinkedInSocialActions({
      likesSummary: { totalLikes: null, aggregatedTotalLikes: "3" },
      commentsSummary: { totalFirstLevelComments: -1 },
    })).toEqual({});
  });

  it("uses a stable UTC daily bucket for idempotent snapshots", () => {
    expect(analyticsDayBucket(new Date("2026-10-13T22:11:12.000Z")))
      .toBe("2026-10-13T00:00:00.000Z");
    expect(analyticsDayBucket(new Date("2026-10-13T00:01:00.000Z")))
      .toBe("2026-10-13T00:00:00.000Z");
  });
});
