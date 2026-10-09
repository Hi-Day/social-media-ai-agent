export type Observation = {
  metric_key: string;
  platform: string;
  value: number | string;
  observed_at: string;
  source_type: string;
};

export type AnalyticsSummary = {
  observationCount: number;
  platforms: string[];
  sourceCounts: Record<string, number>;
  metrics: Record<string, { count: number; total: number; average: number; latestValue: number; latestAt: string }>;
  byPlatform: Record<string, { observations: number; metrics: Record<string, number> }>;
};

/** Summarize observations without presenting manual records as live provider data. */
export function summarizeObservations(observations: Observation[]): AnalyticsSummary {
  const metrics: AnalyticsSummary["metrics"] = {};
  const byPlatform: AnalyticsSummary["byPlatform"] = {};
  const sourceCounts: Record<string, number> = {};
  for (const row of observations) {
    const value = Number(row.value);
    if (!Number.isFinite(value) || value < 0) continue;
    sourceCounts[row.source_type] = (sourceCounts[row.source_type] ?? 0) + 1;
    const metric = metrics[row.metric_key] ?? { count: 0, total: 0, average: 0, latestValue: value, latestAt: row.observed_at };
    metric.count += 1;
    metric.total += value;
    if (Date.parse(row.observed_at) >= Date.parse(metric.latestAt)) {
      metric.latestAt = row.observed_at;
      metric.latestValue = value;
    }
    metric.average = metric.total / metric.count;
    metrics[row.metric_key] = metric;
    const platform = byPlatform[row.platform] ?? { observations: 0, metrics: {} };
    platform.observations += 1;
    platform.metrics[row.metric_key] = (platform.metrics[row.metric_key] ?? 0) + value;
    byPlatform[row.platform] = platform;
  }
  return { observationCount: Object.values(sourceCounts).reduce((a, b) => a + b, 0), platforms: Object.keys(byPlatform).sort(), sourceCounts, metrics, byPlatform };
}
