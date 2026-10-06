import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaption } from "@/lib/agent";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";

    if (idea.length < 3 || idea.length > 4000) {
      return NextResponse.json({ error: "Idea must be between 3 and 4000 characters." }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("name, voice, description, audience, pillars, do_rules, cta_style, forbidden_topics, hashtag_strategy, example_posts, platform_guidance")
      .eq("workspace_id", workspaceId)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    // Keep content generation usable while a pending DB migration is being applied.
    if (brandError && /column .* does not exist/i.test(brandError.message)) {
      const fallback = await supabase
        .from("brands")
        .select("name, voice, description, audience")
        .eq("workspace_id", workspaceId)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      brand = fallback.data as typeof brand;
      brandError = fallback.error;
    }

    if (brandError) return NextResponse.json({ error: brandError.message }, { status: 500 });

    const caption = await generateCaption(idea, brand ?? {});

    return NextResponse.json({
      caption,
      mode: process.env.OPENROUTER_API_KEY ? "live" : "demo",
      brand: brand?.name ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
