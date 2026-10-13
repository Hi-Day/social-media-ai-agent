import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSocialToken } from "@/lib/social-token-crypto";

export const runtime = "nodejs";

function fail(origin: string, code: string) {
  const response = NextResponse.redirect(new URL("/?integration_error=" + encodeURIComponent(code), origin));
  response.cookies.delete("instagram_oauth_state");
  response.cookies.delete("instagram_oauth_workspace");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (providerError) return fail(url.origin, "instagram_authorization_denied");
  if (!code || !state || !clientId || !clientSecret || !redirectUri) {
    return fail(url.origin, "instagram_oauth_configuration_or_code_invalid");
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail(url.origin, "session_expired");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("instagram_oauth_state")?.value;
  const workspaceId = cookieStore.get("instagram_oauth_workspace")?.value;
  if (!expectedState || state !== expectedState || !workspaceId) return fail(url.origin, "instagram_state_invalid");

  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return fail(url.origin, "workspace_permission_denied");

  try {
    const shortTokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
      cache: "no-store",
    });
    if (!shortTokenResponse.ok) return fail(url.origin, "instagram_token_exchange_failed");
    const shortTokenData = await shortTokenResponse.json() as { access_token?: string; user_id?: number | string };
    if (!shortTokenData.access_token) return fail(url.origin, "instagram_token_response_invalid");

    const longTokenUrl = new URL("https://graph.instagram.com/access_token");
    longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
    longTokenUrl.searchParams.set("client_secret", clientSecret);
    longTokenUrl.searchParams.set("access_token", shortTokenData.access_token);
    const longTokenResponse = await fetch(longTokenUrl, { cache: "no-store" });
    if (!longTokenResponse.ok) return fail(url.origin, "instagram_long_lived_token_exchange_failed");
    const longTokenData = await longTokenResponse.json() as { access_token?: string; token_type?: string; expires_in?: number };
    if (!longTokenData.access_token || !Number.isFinite(longTokenData.expires_in) || !longTokenData.expires_in) {
      return fail(url.origin, "instagram_long_lived_token_response_invalid");
    }

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "user_id,username");
    profileUrl.searchParams.set("access_token", longTokenData.access_token);
    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    if (!profileResponse.ok) return fail(url.origin, "instagram_profile_lookup_failed");
    const profile = await profileResponse.json() as { user_id?: string | number; id?: string | number; username?: string };
    const accountId = String(profile.user_id ?? profile.id ?? shortTokenData.user_id ?? "");
    if (!accountId) return fail(url.origin, "instagram_profile_id_missing");

    const { error: saveError } = await supabase.from("social_connections").upsert({
      workspace_id: workspaceId,
      provider: "instagram",
      provider_account_id: accountId,
      account_name: profile.username ?? null,
      encrypted_access_token: encryptSocialToken(longTokenData.access_token),
      token_expires_at: new Date(Date.now() + longTokenData.expires_in * 1000).toISOString(),
      scopes: ["instagram_business_basic", "instagram_business_content_publish"],
      connected_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,provider,provider_account_id" });
    if (saveError) return fail(url.origin, "instagram_connection_save_failed");

    const response = NextResponse.redirect(new URL("/?integration=instagram_connected", url.origin));
    response.cookies.delete("instagram_oauth_state");
    response.cookies.delete("instagram_oauth_workspace");
    return response;
  } catch {
    return fail(url.origin, "instagram_connection_failed");
  }
}
