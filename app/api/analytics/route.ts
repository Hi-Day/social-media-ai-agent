import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeObservations } from "@/lib/analytics-summary";
import { summarizeAnalyticsDataQuality } from "@/lib/analytics-data-quality";

const ALLOWED_RANGES = new Set([7, 30, 90]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  const requestedDays = Number(url.searchParams.get("days") ?? 30);
  const days = ALLOWED_RANGES.has(requestedDays) ? requestedDays : 30;
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify workspace permissions" }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [observationsResult, providerObservationsResult, insightsResult] = await Promise.all([
    supabase.from("performance_observations")
      .select("id, metric_key, platform, value, observed_at, post_ref, source_type, evidence")
      .eq("workspace_id", workspaceId).gte("observed_at", since)
      .order("observed_at", { ascending: false }).limit(1000),
    supabase.from("provider_analytics_observations")
      .select("id, provider, metric_key, metric_value, observed_at, provider_post_id, fetched_at, provider_api_version, evidence")
      .eq("workspace_id", workspaceId).gte("observed_at", since)
      .order("observed_at", { ascending: false }).limit(1000),
    supabase.from("performance_insights")
      .select("id, insight_type, period_start, period_end, finding, confidence, created_at, campaign_id")
      .eq("workspace_id", workspaceId).eq("status", "active")
      .order("created_at", { ascending: false }).limit(20),
  ]);

  if (observationsResult.error) {
    return NextResponse.json({ error: "Unable to load analytics observations. Confirm learning-loop migrations are applied." }, { status: 500 });
  }
  if (providerObservationsResult.error) {
    return NextResponse.json({ error: "Unable to load provider analytics observations. Confirm provider analytics migrations are applied." }, { status: 500 });
  }
  if (insightsResult.error) {
    return NextResponse.json({ error: "Unable to load performance insights. Confirm learning-loop migrations are applied." }, { status: 500 });
  }

  const manualAndSystemObservations = observationsResult.data ?? [];
  const providerObservations = (providerObservationsResult.data ?? []).map((row) => ({
    id: row.id,
    metric_key: row.metric_key,
    platform: row.provider,
    value: row.metric_value,
    observed_at: row.observed_at,
    post_ref: row.provider_post_id,
    source_type: "provider",
    evidence: {
      ...(row.evidence && typeof row.evidence === "object" ? row.evidence : {}),
      fetched_at: row.fetched_at,
      provider_api_version: row.provider_api_version,
    },
  }));
  const observations = [...manualAndSystemObservations, ...providerObservations]
    .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))
    .slice(0, 1000);
  return NextResponse.json({
    workspaceId,
    rangeDays: days,
    since,
    summary: summarizeObservations(observations),
    observations,
    insights: insightsResult.data ?? [],
    dataQuality: summarizeAnalyticsDataQuality(observations),
  });
}
