import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSocialToken } from "@/lib/social-token-crypto";

export const runtime = "nodejs";

function fail(origin: string, code: string) {
  const response = NextResponse.redirect(new URL("/?integration_error=" + encodeURIComponent(code), origin));
  response.cookies.delete("tiktok_oauth_state");
  response.cookies.delete("tiktok_oauth_workspace");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (providerError) return fail(url.origin, "tiktok_authorization_denied");
  if (!code || !state || !clientKey || !clientSecret || !redirectUri) {
    return fail(url.origin, "tiktok_oauth_configuration_or_code_invalid");
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail(url.origin, "session_expired");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("tiktok_oauth_state")?.value;
  const workspaceId = cookieStore.get("tiktok_oauth_workspace")?.value;
  if (!expectedState || state !== expectedState || !workspaceId) return fail(url.origin, "tiktok_state_invalid");

  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return fail(url.origin, "workspace_permission_denied");

  try {
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return fail(url.origin, "tiktok_token_exchange_failed");
    const tokenPayload = await tokenResponse.json() as {
      data?: { access_token?: string; expires_in?: number; open_id?: string; refresh_token?: string; refresh_expires_in?: number; scope?: string };
      error?: { code?: string };
    };
    const token = tokenPayload.data;
    if (!token?.access_token || !token.open_id || !Number.isFinite(token.expires_in) || !token.expires_in) {
      return fail(url.origin, "tiktok_token_response_invalid");
    }

    const profileUrl = new URL("https://open.tiktokapis.com/v2/user/info/");
    profileUrl.searchParams.set("fields", "open_id,display_name,avatar_url,profile_deep_link");
    const profileResponse = await fetch(profileUrl, {
      headers: { Authorization: "Bearer " + token.access_token },
      cache: "no-store",
    });
    if (!profileResponse.ok) return fail(url.origin, "tiktok_profile_lookup_failed");
    const profilePayload = await profileResponse.json() as {
      data?: { user?: { open_id?: string; display_name?: string; profile_deep_link?: string } };
      error?: { code?: string };
    };
    const profile = profilePayload.data?.user;
    const accountId = profile?.open_id ?? token.open_id;
    if (!accountId) return fail(url.origin, "tiktok_profile_id_missing");

    const { error: saveError } = await supabase.from("social_connections").upsert({
      workspace_id: workspaceId,
      provider: "tiktok",
      provider_account_id: accountId,
      account_name: profile?.display_name ?? null,
      encrypted_access_token: encryptSocialToken(token.access_token),
      encrypted_refresh_token: token.refresh_token ? encryptSocialToken(token.refresh_token) : null,
      token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      refresh_token_expires_at: token.refresh_expires_in
        ? new Date(Date.now() + token.refresh_expires_in * 1000).toISOString()
        : null,
      scopes: (token.scope ?? "").split(/[\s,]+/).filter(Boolean),
      connected_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,provider,provider_account_id" });
    if (saveError) return fail(url.origin, "tiktok_connection_save_failed");

    const response = NextResponse.redirect(new URL("/?integration=tiktok_connected", url.origin));
    response.cookies.delete("tiktok_oauth_state");
    response.cookies.delete("tiktok_oauth_workspace");
    return response;
  } catch {
    return fail(url.origin, "tiktok_connection_failed");
  }
}
