import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getContext() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { supabase, user: null };
  return { supabase, user: userData.user };
}

async function getWorkspaceAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, workspaceId: string) {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function GET(request: Request) {
  const { supabase, user } = await getContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const membership = await getWorkspaceAccess(supabase, user.id, workspaceId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: baseBrand, error } = await supabase
    .from("brands")
    .select("id, workspace_id, name, voice, description, audience, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let brand = baseBrand;
  if (baseBrand) {
    const { data: enrichedBrand, error: enrichedError } = await supabase
      .from("brands")
      .select("id, workspace_id, name, voice, description, audience, pillars, do_rules, cta_style, forbidden_topics, hashtag_strategy, example_posts, platform_guidance, created_at")
      .eq("id", baseBrand.id)
      .maybeSingle();
    if (!enrichedError) brand = enrichedBrand;
  }

  return NextResponse.json({ brand: brand ?? null, role: membership.role });
}

export async function PUT(request: Request) {
  const { supabase, user } = await getContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const membership = await getWorkspaceAccess(supabase, user.id, workspaceId);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can update the Brand Brain." }, { status: 403 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";
  const pillars = typeof body.pillars === "string" ? body.pillars.trim() : "";
  const doRules = typeof body.doRules === "string" ? body.doRules.trim() : "";
  const ctaStyle = typeof body.ctaStyle === "string" ? body.ctaStyle.trim() : "";
  const forbiddenTopics = typeof body.forbiddenTopics === "string" ? body.forbiddenTopics.trim() : "";
  const hashtagStrategy = typeof body.hashtagStrategy === "string" ? body.hashtagStrategy.trim() : "";
  const examplePosts = typeof body.examplePosts === "string" ? body.examplePosts.trim() : "";
  const platformGuidance = typeof body.platformGuidance === "string" ? body.platformGuidance.trim() : "";

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Brand name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (
    voice.length > 4000 ||
    description.length > 4000 ||
    audience.length > 2000 ||
    pillars.length > 3000 ||
    doRules.length > 4000 ||
    ctaStyle.length > 1500 ||
    forbiddenTopics.length > 3000 ||
    hashtagStrategy.length > 2000 ||
    examplePosts.length > 8000 ||
    platformGuidance.length > 4000
  ) {
    return NextResponse.json({ error: "Brand Brain fields are too long." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const payload = {
    name,
    voice: voice || null,
    description: description || null,
    audience: audience || null,
    pillars: pillars || null,
    do_rules: doRules || null,
    cta_style: ctaStyle || null,
    forbidden_topics: forbiddenTopics || null,
    hashtag_strategy: hashtagStrategy || null,
    example_posts: examplePosts || null,
    platform_guidance: platformGuidance || null,
  };
  const query = existing
    ? supabase.from("brands").update(payload).eq("id", existing.id)
    : supabase.from("brands").insert({ workspace_id: workspaceId, ...payload });

  const { data: brand, error } = await query
    .select("id, workspace_id, name, voice, description, audience, created_at")
    .single();

  if (error || !brand) return NextResponse.json({ error: error?.message || "Unable to save Brand Brain." }, { status: 500 });
  return NextResponse.json({ brand });
}
