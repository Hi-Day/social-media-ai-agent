import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSocialToken, encryptSocialToken } from "@/lib/social-token-crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsedBody: unknown = await request.json().catch(() => ({}));
  const body = parsedBody && typeof parsedBody === "object" ? parsedBody as Record<string, unknown> : {};
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const connectionId = typeof body.connectionId === "string" ? body.connectionId : "";
  if (!workspaceId || !connectionId) return NextResponse.json({ error: "workspaceId and connectionId are required" }, { status: 400 });
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return NextResponse.json({ error: "TikTok integration is not configured" }, { status: 503 });

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }
  const { data: connection, error } = await supabase.from("social_connections")
    .select("id, encrypted_refresh_token, refresh_token_expires_at")
    .eq("id", connectionId).eq("workspace_id", workspaceId).eq("provider", "tiktok").maybeSingle();
  if (error || !connection?.encrypted_refresh_token) {
    return NextResponse.json({ error: "TikTok refresh token is unavailable; reconnect the account" }, { status: 409 });
  }
  if (!connection.refresh_token_expires_at || new Date(connection.refresh_token_expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "TikTok refresh token expired; reconnect the account" }, { status: 409 });
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSocialToken(connection.encrypted_refresh_token);
  } catch {
    return NextResponse.json({ error: "TikTok refresh token could not be decrypted" }, { status: 500 });
  }

  try {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "TikTok token refresh failed; reconnect if the issue persists" }, { status: 502 });
    const payload = await response.json() as { data?: { access_token?: string; expires_in?: number; refresh_token?: string; refresh_expires_in?: number; scope?: string } };
    const token = payload.data;
    if (!token?.access_token || !Number.isFinite(token.expires_in) || !token.expires_in) {
      return NextResponse.json({ error: "TikTok token refresh response was invalid" }, { status: 502 });
    }
    const updates: Record<string, unknown> = {
      encrypted_access_token: encryptSocialToken(token.access_token),
      token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (token.refresh_token) updates.encrypted_refresh_token = encryptSocialToken(token.refresh_token);
    if (token.refresh_expires_in) updates.refresh_token_expires_at = new Date(Date.now() + token.refresh_expires_in * 1000).toISOString();
    if (token.scope) updates.scopes = token.scope.split(/[\s,]+/).filter(Boolean);
    const { error: saveError } = await supabase.from("social_connections").update(updates)
      .eq("id", connectionId).eq("workspace_id", workspaceId).eq("provider", "tiktok");
    if (saveError) return NextResponse.json({ error: "TikTok token refreshed but could not be persisted; reconnect and verify account status" }, { status: 500 });
    return NextResponse.json({ refreshed: true, expiresAt: updates.token_expires_at });
  } catch {
    return NextResponse.json({ error: "TikTok token refresh could not be confirmed" }, { status: 502 });
  }
}
