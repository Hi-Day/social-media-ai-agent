import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  const { data, error } = await supabase.from("social_connections")
    .select("id, provider, provider_account_id, account_name, token_expires_at, scopes, connected_at")
    .eq("workspace_id", workspaceId).eq("provider", "linkedin").order("connected_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load social connections" }, { status: 500 });
  return NextResponse.json({ connections: (data ?? []).map((item) => ({ ...item, tokenExpired: new Date(item.token_expires_at).getTime() <= Date.now() })) });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";
  if (!workspaceId || !connectionId) return NextResponse.json({ error: "workspaceId and connectionId are required" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  const { error } = await supabase.from("social_connections").delete().eq("id", connectionId).eq("workspace_id", workspaceId).eq("provider", "linkedin");
  if (error) return NextResponse.json({ error: "Unable to disconnect LinkedIn account" }, { status: 500 });
  return NextResponse.json({ disconnected: true });
}
