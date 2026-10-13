import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("social_connections")
    .select("id, provider, account_name, token_expires_at, connected_at")
    .eq("workspace_id", workspaceId)
    .order("connected_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load social account status" }, { status: 500 });

  const configured = {
    instagram: Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_REDIRECT_URI),
    tiktok: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REDIRECT_URI),
    linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_REDIRECT_URI),
  };
  const providers = Object.fromEntries(
    Object.entries(configured).map(([provider, isConfigured]) => [
      provider,
      {
        configured: isConfigured,
        connections: (data ?? [])
          .filter((connection) => connection.provider === provider)
          .map((connection) => ({
            id: connection.id,
            accountName: connection.account_name,
            connectedAt: connection.connected_at,
            tokenExpiresAt: connection.token_expires_at,
            tokenExpired: !connection.token_expires_at || new Date(connection.token_expires_at).getTime() <= Date.now(),
          })),
      },
    ]),
  );

  return NextResponse.json({ providers });
}
