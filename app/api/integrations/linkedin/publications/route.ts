import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }

  const { data, error } = await supabase.from("social_publications")
    .select("id, draft_id, provider, status, provider_post_id, provider_status_code, error_code, started_at, completed_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("provider", "linkedin")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Unable to load publication history" }, { status: 500 });
  return NextResponse.json({ publications: data ?? [] });
}
