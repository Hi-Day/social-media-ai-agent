import { describe, expect, it } from "vitest";
import { summarizeObservations } from "../lib/analytics-summary";

describe("analytics observation summary", () => {
  it("aggregates metric values and preserves the latest observed value", () => {
    const result = summarizeObservations([
      { metric_key: "likes", platform: "linkedin", value: 10, observed_at: "2026-01-01T00:00:00Z", source_type: "manual" },
      { metric_key: "likes", platform: "linkedin", value: "20", observed_at: "2026-01-02T00:00:00Z", source_type: "provider" },
      { metric_key: "engagement_rate", platform: "instagram", value: 4.5, observed_at: "2026-01-02T00:00:00Z", source_type: "manual" },
    ]);
    expect(result.observationCount).toBe(3);
    expect(result.metrics.likes).toMatchObject({ count: 2, total: 30, average: 15, latestValue: 20 });
    expect(result.platforms).toEqual(["instagram", "linkedin"]);
    expect(result.sourceCounts).toEqual({ manual: 2, provider: 1 });
    expect(result.byPlatform.linkedin.metrics.likes).toBe(30);
  });

  it("ignores invalid numeric values rather than corrupting totals", () => {
    const result = summarizeObservations([
      { metric_key: "likes", platform: "linkedin", value: "not-a-number", observed_at: "2026-01-01T00:00:00Z", source_type: "manual" },
      { metric_key: "likes", platform: "linkedin", value: -1, observed_at: "2026-01-01T00:00:00Z", source_type: "manual" },
    ]);
    expect(result.observationCount).toBe(0);
    expect(result.metrics).toEqual({});
  });

  it("ignores blank values and invalid timestamps instead of poisoning latest-value tracking", () => {
    const result = summarizeObservations([
      { metric_key: "likes", platform: "linkedin", value: " ", observed_at: "2026-01-04T00:00:00Z", source_type: "manual" },
      { metric_key: "likes", platform: "linkedin", value: 999, observed_at: "not-a-date", source_type: "manual" },
      { metric_key: "likes", platform: "linkedin", value: 12, observed_at: "2026-01-02T00:00:00Z", source_type: "manual" },
      { metric_key: "likes", platform: "linkedin", value: 15, observed_at: "2026-01-03T00:00:00Z", source_type: "manual" },
    ]);
    expect(result.observationCount).toBe(2);
    expect(result.metrics.likes).toMatchObject({ count: 2, total: 27, latestValue: 15, latestAt: "2026-01-03T00:00:00Z" });
  });

  it("ignores rows without source, platform, or metric identifiers", () => {
    const result = summarizeObservations([
      { metric_key: "", platform: "linkedin", value: 1, observed_at: "2026-01-01T00:00:00Z", source_type: "manual" },
      { metric_key: "likes", platform: "linkedin", value: 2, observed_at: "2026-01-01T00:00:00Z", source_type: " " },
    ]);
    expect(result.observationCount).toBe(0);
  });
});
