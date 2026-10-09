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
  const [observationsResult, insightsResult] = await Promise.all([
    supabase.from("performance_observations")
      .select("id, metric_key, platform, value, observed_at, post_ref, source_type, evidence")
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
  if (insightsResult.error) {
    return NextResponse.json({ error: "Unable to load performance insights. Confirm learning-loop migrations are applied." }, { status: 500 });
  }

  const observations = observationsResult.data ?? [];
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
