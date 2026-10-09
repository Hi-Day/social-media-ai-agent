import { describe, expect, it } from "vitest";
import { summarizeAnalyticsDataQuality } from "../lib/analytics-data-quality";

describe("analytics data provenance", () => {
  it("reports recorded provider observations without claiming a live connection", () => {
    const result = summarizeAnalyticsDataQuality([
      { source_type: "manual", observed_at: "2026-01-01T00:00:00Z" },
      { source_type: "provider", observed_at: "2026-01-02T00:00:00Z" },
      { source_type: "provider", observed_at: "2026-01-03T00:00:00Z" },
      { source_type: "system", observed_at: "2026-01-03T00:00:00Z" },
    ]);
    expect(result).toMatchObject({
      providerAnalyticsObservedInRange: true,
      providerObservationCount: 2,
      latestProviderObservationAt: "2026-01-03T00:00:00Z",
      manualObservationCount: 1,
      systemObservationCount: 1,
    });
    expect(result.note).toContain("does not confirm an active provider connection");
    expect(JSON.stringify(result)).not.toContain("liveProviderAnalyticsConnected");
  });

  it("reports provider analytics as unobserved when there are no provider rows", () => {
    const result = summarizeAnalyticsDataQuality([
      { source_type: "manual", observed_at: "not-a-date" },
    ]);
    expect(result).toMatchObject({
      providerAnalyticsObservedInRange: false,
      providerObservationCount: 0,
      latestProviderObservationAt: null,
      manualObservationCount: 1,
      systemObservationCount: 0,
    });
  });
});
