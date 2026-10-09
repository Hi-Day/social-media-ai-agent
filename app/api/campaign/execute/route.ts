import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeCampaignTask } from "@/lib/campaign-agent";
import type { BrandContext } from "@/lib/agent";
import { canExecuteCampaign } from "@/lib/campaign-permissions";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";

    if (!workspaceId || !campaignId) {
      return NextResponse.json({ error: "workspaceId and campaignId are required." }, { status: 400 });
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
    if (!canExecuteCampaign(membership.role)) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can execute campaigns because execution may incur model costs." },
        { status: 403 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,name,objective,audience,status,selected_package")
      .eq("id", campaignId)
      .eq("workspace_id", workspaceId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }
    if (!campaign.selected_package) {
      return NextResponse.json({ error: "Select a campaign package before execution." }, { status: 409 });
    }

    let { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("name,voice,description,audience,pillars,do_rules,cta_style,forbidden_topics,hashtag_strategy,example_posts,platform_guidance")
      .eq("workspace_id", workspaceId)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (brandError && /column .* does not exist/i.test(brandError.message)) {
      const fallback = await supabase
        .from("brands")
        .select("name,voice,description,audience")
        .eq("workspace_id", workspaceId)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      brand = fallback.data as typeof brand;
      brandError = fallback.error;
    } else if (brandError) {
      return NextResponse.json({ error: brandError.message }, { status: 500 });
    }

    const brandContext: BrandContext = brand ?? {};

    // Recover tasks abandoned by a crashed/timed-out serverless invocation.
    // Claiming a task refreshes updated_at, so only genuinely stale work is reset.
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const { error: recoveryError } = await supabase
      .from("content_drafts")
      .update({
        generation_status: "failed",
        generation_error: "Previous generation was interrupted or timed out. Retry campaign execution to resume this task.",
        updated_at: now.toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("campaign_id", campaignId)
      .eq("generation_status", "generating")
      .lt("updated_at", staleBefore);

    if (recoveryError) {
      return NextResponse.json({ error: "Unable to recover interrupted campaign tasks." }, { status: 500 });
    }

    const { data: tasks, error: taskError } = await supabase
      .from("content_drafts")
      .select("id,title,platform,content_type,model_codename,estimated_credits,generation_status")
      .eq("workspace_id", workspaceId)
      .eq("campaign_id", campaignId)
      .in("generation_status", ["pending", "failed"])
      .order("created_at");

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
    if (!tasks?.length) {
      return NextResponse.json({ campaignId, generated: 0, remaining: 0, message: "No pending campaign tasks." });
    }

    let generated = 0;
    let mediaPending = 0;
    const errors: string[] = [];

    for (const task of tasks.slice(0, 25)) {
      // Atomically claim only tasks that are still pending/failed. Concurrent
      // requests must not generate the same asset or spend credits twice.
      const { data: claimedTask, error: claimError } = await supabase
        .from("content_drafts")
        .update({ generation_status: "generating", generation_error: null, updated_at: new Date().toISOString() })
        .eq("id", task.id)
        .eq("workspace_id", workspaceId)
        .in("generation_status", ["pending", "failed"])
        .select("id")
        .maybeSingle();

      if (claimError) {
        errors.push(`${task.id}: Unable to claim task for execution.`);
        continue;
      }
      if (!claimedTask) continue;

      try {
        const result = await executeCampaignTask(task, {
          name: campaign.name,
          objective: campaign.objective,
          audience: campaign.audience,
        }, brandContext);

        const generationStatus = result.mediaRequired && result.mediaStatus !== "generated"
          ? result.mediaStatus === "provider_unavailable" ? "provider_unavailable" : "failed"
          : "generated";

        const { error: updateError } = await supabase
          .from("content_drafts")
          .update({
            caption: result.caption,
            status: "draft",
            generation_status: generationStatus,
            generation_error: result.mediaRequired && result.mediaStatus !== "generated"
              ? result.mediaStatus === "provider_unavailable"
                ? "Caption generated, but the required media asset could not be generated because its provider is unavailable."
                : "Required media asset was not generated. Review this task before publishing."
              : null,
            generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            media_status: result.mediaRequired ? result.mediaStatus : "not_required",
            media_url: result.mediaUrl ?? null,
            media_metadata: result.mediaMetadata ?? {},
            generation_metadata: {
              campaign_execution: true,
              media_required: result.mediaRequired,
              media_status: result.mediaStatus,
              model_codename: task.model_codename,
            },
          })
          .eq("id", task.id)
          .eq("workspace_id", workspaceId);

        if (updateError) throw new Error(updateError.message);

        generated += 1;
        if (result.mediaRequired && result.mediaStatus !== "generated") mediaPending += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed";
        errors.push(`${task.id}: ${message}`);
        await supabase
          .from("content_drafts")
          .update({ generation_status: "failed", generation_error: message, updated_at: new Date().toISOString() })
          .eq("id", task.id)
          .eq("workspace_id", workspaceId);
      }
    }

    const remaining = Math.max(0, tasks.length - Math.min(tasks.length, 25));

    await supabase
      .from("campaigns")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("workspace_id", workspaceId);

    return NextResponse.json({
      campaignId,
      generated,
      mediaPending,
      remaining,
      errors,
      message: errors.length
        ? "Campaign execution completed with some task errors. Review the failed tasks before publishing."
        : mediaPending > 0
          ? `Generated captions for ${generated} tasks, but ${mediaPending} required media asset(s) could not be generated. Review those tasks before publishing.`
          : "Campaign content generation completed successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campaign execution failed." },
      { status: 500 },
    );
  }
}
