import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  if (!clientId || !redirectUri) return NextResponse.json({ error: "LinkedIn integration is not configured" }, { status: 503 });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });

  const state = randomBytes(32).toString("base64url");
  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "openid profile w_member_social");
  const response = NextResponse.redirect(authUrl);
  const options = { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set("linkedin_oauth_state", state, options);
  response.cookies.set("linkedin_oauth_workspace", workspaceId, options);
  return response;
}
