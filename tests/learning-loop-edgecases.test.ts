import { describe, expect, it } from "vitest";
import { analyzeObservations, type MetricObservation } from "../lib/learning-loop";

const now = new Date("2026-10-09T12:00:00.000Z");
const days = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

describe("learning loop observation boundaries", () => {
  it("normalizes platform names and ignores malformed or future observations", () => {
    const rows: MetricObservation[] = [
      { metric_key: "likes", platform: "Instagram", value: 10, observed_at: days(13) },
      { metric_key: "likes", platform: "instagram", value: 12, observed_at: days(10) },
      { metric_key: "likes", platform: "INSTAGRAM", value: 20, observed_at: days(4) },
      { metric_key: "likes", platform: "instagram", value: 22, observed_at: days(1) },
      { metric_key: "likes", platform: "instagram", value: 1000, observed_at: "bad-timestamp" },
      { metric_key: "likes", platform: "instagram", value: 1000, observed_at: days(-1) },
    ];
    const result = analyzeObservations(rows, now);
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("instagram");
    expect(result[0].sample_size_previous).toBe(2);
    expect(result[0].sample_size_current).toBe(2);
  });

  it("does not create an insight when the relative change is below the configured threshold", () => {
    const rows: MetricObservation[] = [
      { metric_key: "likes", platform: "instagram", value: 100, observed_at: days(13) },
      { metric_key: "likes", platform: "instagram", value: 102, observed_at: days(10) },
      { metric_key: "likes", platform: "instagram", value: 103, observed_at: days(4) },
      { metric_key: "likes", platform: "instagram", value: 104, observed_at: days(1) },
    ];
    expect(analyzeObservations(rows, now)).toHaveLength(0);
  });
});
