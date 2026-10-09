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
    .select("campaign_id,content_draft_id,model_codename,estimated_credits,result_status,created_at")
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
  const byModel = rows.reduce<Record<string, { events: number; estimatedCredits: number }>>((summary, event) => {
    const key = event.model_codename || "Automatic";
    const item = summary[key] ?? { events: 0, estimatedCredits: 0 };
    item.events += 1;
    item.estimatedCredits += Number(event.estimated_credits || 0);
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
      byModel,
    },
    note: "This is an estimate of product credits for the latest 500 attempts, not provider-billed USD cost. Older attempts may be omitted when the limit is reached.",
  });
}
