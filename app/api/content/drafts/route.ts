import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (data.user && !error) {
    return { supabase, userId: data.user.id };
  }

  return { supabase, userId: null };
}

export async function GET(request: Request) {
  const { supabase, userId } = await getAuthenticatedClient();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("content_drafts")
    .select("id, workspace_id, title, platform, caption, status, generation_status, generation_error, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, userId } = await getAuthenticatedClient();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform.trim() : "Multi-platform";

  if (!workspaceId || idea.length < 3 || caption.length < 3) {
    return NextResponse.json({ error: "workspaceId, idea and caption are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_drafts")
    .insert({
      workspace_id: workspaceId,
      title: idea.slice(0, 120),
      platform,
      caption,
      status: "draft",
    })
    .select("id, workspace_id, title, platform, caption, status, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data }, { status: 201 });
}
