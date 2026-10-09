export type AnalyticsSourceObservation = {
  source_type: string;
  observed_at: string;
};

export type AnalyticsDataQuality = {
  providerAnalyticsObservedInRange: boolean;
  providerObservationCount: number;
  latestProviderObservationAt: string | null;
  manualObservationCount: number;
  systemObservationCount: number;
  note: string;
};

/**
 * Describe provenance of saved observations only. This intentionally does not infer
 * that a provider account is connected or that analytics are live/current.
 */
export function summarizeAnalyticsDataQuality(
  observations: AnalyticsSourceObservation[],
): AnalyticsDataQuality {
  const provider = observations.filter((row) => row.source_type === "provider");
  const manualObservationCount = observations.filter((row) => row.source_type === "manual").length;
  const systemObservationCount = observations.filter((row) => row.source_type === "system").length;
  const latestProviderObservationAt = provider.reduce<string | null>((latest, row) => {
    if (!Number.isFinite(Date.parse(row.observed_at))) return latest;
    if (!latest || Date.parse(row.observed_at) > Date.parse(latest)) return row.observed_at;
    return latest;
  }, null);

  return {
    providerAnalyticsObservedInRange: provider.length > 0,
    providerObservationCount: provider.length,
    latestProviderObservationAt,
    manualObservationCount,
    systemObservationCount,
    note: "This summarizes recorded observations only. It does not confirm an active provider connection or guarantee live analytics; manual and system observations are not live platform metrics.",
  };
}
