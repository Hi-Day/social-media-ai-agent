import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || "";
  const campaignId = url.searchParams.get("campaignId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: "Unable to verify workspace permissions." }, { status: 500 });
  }
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let query = supabase
    .from("campaign_usage_events")
    .select("campaign_id,content_draft_id,model_codename,estimated_credits,result_status,prompt_tokens,completion_tokens,total_tokens,provider_cost_usd,cost_source,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data: events, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Unable to load usage history. Confirm the campaign usage migration has been applied." }, { status: 500 });
  }

  const rows = events ?? [];
  const totalEstimatedCredits = rows.reduce((sum, event) => sum + Number(event.estimated_credits || 0), 0);
  const counts = rows.reduce(
    (summary, event) => {
      const status = event.result_status as keyof typeof summary;
      if (status in summary) summary[status] += 1;
      return summary;
    },
    { generated: 0, media_pending: 0, failed: 0 },
  );
  const costSummary = rows.reduce((summary, event) => {
    const source = event.cost_source as "provider_reported" | "partial" | "not_available" | "demo";
    if (source === "provider_reported") summary.providerReportedEvents += 1;
    else if (source === "partial") summary.partialCostEvents += 1;
    else if (source === "demo") summary.demoEvents += 1;
    else summary.costUnknownEvents += 1;
    if (event.provider_cost_usd !== null && event.provider_cost_usd !== undefined) {
      summary.knownProviderCostUsd += Number(event.provider_cost_usd);
    }
    if (event.total_tokens !== null && event.total_tokens !== undefined) {
      summary.totalKnownTokens += Number(event.total_tokens);
    }
    return summary;
  }, { knownProviderCostUsd: 0, totalKnownTokens: 0, providerReportedEvents: 0, partialCostEvents: 0, costUnknownEvents: 0, demoEvents: 0 });
  const byModel = rows.reduce<Record<string, { events: number; estimatedCredits: number; knownProviderCostUsd: number; providerCostEvents: number }>>((summary, event) => {
    const key = event.model_codename || "Automatic";
    const item = summary[key] ?? { events: 0, estimatedCredits: 0, knownProviderCostUsd: 0, providerCostEvents: 0 };
    item.events += 1;
    item.estimatedCredits += Number(event.estimated_credits || 0);
    if (event.provider_cost_usd !== null && event.provider_cost_usd !== undefined) {
      item.knownProviderCostUsd += Number(event.provider_cost_usd);
      item.providerCostEvents += 1;
    }
    summary[key] = item;
    return summary;
  }, {});

  return NextResponse.json({
    workspaceId,
    campaignId: campaignId || null,
    limit: 500,
    events: rows,
    summary: {
      recordedAttempts: rows.length,
      totalEstimatedCredits: Number(totalEstimatedCredits.toFixed(4)),
      ...counts,
      knownProviderCostUsd: Number(costSummary.knownProviderCostUsd.toFixed(8)),
      totalKnownTokens: costSummary.totalKnownTokens,
      providerReportedEvents: costSummary.providerReportedEvents,
      partialCostEvents: costSummary.partialCostEvents,
      costUnknownEvents: costSummary.costUnknownEvents,
      demoEvents: costSummary.demoEvents,
      byModel,
    },
    note: "Provider USD cost is shown only when reported by the gateway. Partial events contain a known subtotal, not a full task cost; unknown costs are not treated as zero. Product credits are separate estimates. Only the latest 500 attempts are included.",
  });
}
