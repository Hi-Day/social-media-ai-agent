import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!memberships?.length) {
    return NextResponse.json({ workspace: null });
  }

  const workspaceId = memberships[0].workspace_id;
  const [{ data: workspace }, { data: brands }] = await Promise.all([
    supabase.from("workspaces").select("id, name, created_at").eq("id", workspaceId).single(),
    supabase.from("brands").select("id, name, voice, description, audience").eq("workspace_id", workspaceId).order("created_at").limit(1),
  ]);

  let brand = brands?.[0] ?? null;
  if (brand) {
    const { data: enrichedBrand, error: enrichedError } = await supabase
      .from("brands")
      .select("id, name, voice, description, audience, pillars, do_rules, cta_style, forbidden_topics, hashtag_strategy, example_posts, platform_guidance")
      .eq("id", brand.id)
      .maybeSingle();
    if (!enrichedError) brand = enrichedBrand ?? brand;
  }

  return NextResponse.json({
    workspace,
    brand,
    role: memberships[0].role,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const workspaceName =
    typeof body.name === "string" && body.name.trim().length >= 2
      ? body.name.trim()
      : "My Workspace";
  const brandName =
    typeof body.brandName === "string" && body.brandName.trim()
      ? body.brandName.trim()
      : workspaceName;

  // Create workspace, owner membership, and initial brand atomically. The RPC
  // avoids INSERT ... RETURNING on workspaces before the user is a member,
  // which can conflict with the workspace SELECT RLS policy.
  const { data: workspaceId, error: createError } = await supabase.rpc(
    "create_workspace_for_current_user",
    { p_name: workspaceName, p_brand_name: brandName },
  );

  if (createError || !workspaceId) {
    return NextResponse.json(
      { error: createError?.message || "Unable to create workspace" },
      { status: 500 },
    );
  }

  // The RPC has already added the current user as owner, so normal RLS reads
  // are now allowed.
  const [{ data: workspace, error: workspaceReadError }, { data: brands, error: brandReadError }] =
    await Promise.all([
      supabase.from("workspaces").select("id, name, created_at").eq("id", workspaceId).single(),
      supabase
        .from("brands")
        .select("id, name, voice, description, audience")
        .eq("workspace_id", workspaceId)
        .order("created_at")
        .limit(1),
    ]);

  if (workspaceReadError || brandReadError || !workspace) {
    return NextResponse.json(
      { error: workspaceReadError?.message || brandReadError?.message || "Workspace created but could not be loaded" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { workspace, brand: brands?.[0] ?? null, role: "owner" },
    { status: 201 },
  );
}
