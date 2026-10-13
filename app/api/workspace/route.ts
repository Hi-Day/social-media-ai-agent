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

  // Create the workspace, owner membership, and initial brand atomically in the
  // database. This avoids partial rows and keeps workspace bootstrap behind a
  // narrowly granted, auth.uid()-checked function instead of client-side writes.
  const { data: workspaceId, error: workspaceError } = await supabase.rpc(
    "create_workspace",
    {
      p_name: workspaceName,
      p_brand_name: brandName,
    },
  );

  if (workspaceError || typeof workspaceId !== "string") {
    return NextResponse.json(
      { error: workspaceError?.message || "Unable to create workspace" },
      { status: 500 },
    );
  }

  const [{ data: workspace, error: readWorkspaceError }, { data: brands, error: brandError }] =
    await Promise.all([
      supabase
        .from("workspaces")
        .select("id, name, created_at")
        .eq("id", workspaceId)
        .single(),
      supabase
        .from("brands")
        .select("id, name, voice, description, audience")
        .eq("workspace_id", workspaceId)
        .order("created_at")
        .limit(1),
    ]);

  if (readWorkspaceError || !workspace || brandError) {
    return NextResponse.json(
      { error: "Workspace was created but could not be loaded. Refresh and retry." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { workspace, brand: brands?.[0] ?? null, role: "owner" },
    { status: 201 },
  );
}
