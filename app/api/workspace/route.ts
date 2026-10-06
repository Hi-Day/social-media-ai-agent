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
    supabase.from("brands").select("id, name, voice, description, audience, pillars, do_rules, cta_style, forbidden_topics, hashtag_strategy, example_posts, platform_guidance").eq("workspace_id", workspaceId).order("created_at").limit(1),
  ]);

  return NextResponse.json({
    workspace,
    brand: brands?.[0] ?? null,
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

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: workspaceName })
    .select("id, name, created_at")
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: workspaceError?.message || "Unable to create workspace" },
      { status: 500 },
    );
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userData.user.id,
      role: "owner",
    });

  if (memberError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .insert({ workspace_id: workspace.id, name: brandName })
    .select("id, name, voice, description, audience")
    .single();

  if (brandError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    return NextResponse.json({ error: brandError.message }, { status: 500 });
  }

  return NextResponse.json({ workspace, brand, role: "owner" }, { status: 201 });
}
