import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type ModelCodename } from "@/lib/model-registry";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    const packageCode = typeof body.packageCode === "string" ? body.packageCode : "";

    if (!workspaceId || !campaignId || !["starter", "growth", "signature"].includes(packageCode)) {
      return NextResponse.json({ error: "workspaceId, campaignId and a valid packageCode are required." }, { status: 400 });
    }

    const { data: membership } = await supabase.from("workspace_members").select("role")
      .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: pkg, error: packageError } = await supabase.from("content_packages")
      .select("id,campaign_id,workspace_id,code,content_plan,estimated_credits")
      .eq("campaign_id", campaignId).eq("workspace_id", workspaceId).eq("code", packageCode).single();
    if (packageError || !pkg) return NextResponse.json({ error: "Campaign package not found." }, { status: 404 });

    const { data: campaign } = await supabase.from("campaigns").select("id,name,objective,status,selected_package")
      .eq("id", campaignId).eq("workspace_id", workspaceId).single();
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    if (campaign.selected_package) return NextResponse.json({ error: "A package is already selected for this campaign." }, { status: 409 });

    const plan = Array.isArray(pkg.content_plan) ? pkg.content_plan : [];
    const rows = plan.flatMap((item: {
      platform?: string; type?: string; count?: number; capability?: string;
      codename?: string; credits_per_asset?: number;
    }) => {
      const count = Math.max(0, Math.min(50, Number(item.count) || 0));
      const codename = item.codename as ModelCodename;
      const profile = getProfile(item.capability as "text"|"image"|"video"|"voice"|"stt", codename);
      return Array.from({ length: count }, (_, index) => ({
        workspace_id: workspaceId,
        title: `${campaign.name} — ${item.type || "Content"} ${index + 1}`,
        platform: item.platform || "Multi-platform",
        caption: `Campaign content task: ${campaign.objective}`,
        status: "idea",
        campaign_id: campaignId,
        package_id: pkg.id,
        content_type: item.type || "Content",
        model_codename: codename,
        estimated_credits: profile?.credits ?? (Number(item.credits_per_asset) || 0),
      }));
    });

    if (!rows.length) return NextResponse.json({ error: "The selected package has no content tasks." }, { status: 400 });

    const { data: transactionResult, error: transactionError } = await supabase.rpc(
      "select_campaign_package",
      {
        p_workspace_id: workspaceId,
        p_campaign_id: campaignId,
        p_package_code: packageCode,
        p_tasks: rows,
      },
    );

    if (transactionError) {
      const status = ["23505"].includes(transactionError.code ?? "")
        ? 409
        : ["42501"].includes(transactionError.code ?? "")
          ? 403
          : ["P0002"].includes(transactionError.code ?? "")
            ? 404
            : 500;
      return NextResponse.json({ error: transactionError.message }, { status });
    }

    const { data: drafts, error: draftError } = await supabase
      .from("content_drafts")
      .select("id,title,platform,status,campaign_id,package_id,content_type,model_codename,estimated_credits,created_at,updated_at")
      .eq("campaign_id", campaignId)
      .eq("package_id", pkg.id)
      .order("created_at");

    if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });

    return NextResponse.json({ campaignId, packageCode, estimatedCredits: pkg.estimated_credits, tasks: drafts ?? [] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Package selection failed." }, { status: 500 });
  }
}