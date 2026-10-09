import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { encryptSocialToken } from "@/lib/social-token-crypto";

export const runtime = "nodejs";

function fail(origin: string, code: string) {
  const response = NextResponse.redirect(new URL("/?integration_error=" + encodeURIComponent(code), origin));
  response.cookies.delete("linkedin_oauth_state");
  response.cookies.delete("linkedin_oauth_workspace");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (providerError) return fail(url.origin, "linkedin_authorization_denied");
  if (!code || !state || !clientId || !clientSecret || !redirectUri) return fail(url.origin, "linkedin_oauth_configuration_or_code_invalid");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail(url.origin, "session_expired");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("linkedin_oauth_state")?.value;
  const workspaceId = cookieStore.get("linkedin_oauth_workspace")?.value;
  if (!expectedState || state !== expectedState || !workspaceId) return fail(url.origin, "linkedin_state_invalid");

  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return fail(url.origin, "workspace_permission_denied");

  try {
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return fail(url.origin, "linkedin_token_exchange_failed");
    const tokenData = await tokenResponse.json() as { access_token?: string; expires_in?: number; scope?: string };
    if (!tokenData.access_token || !Number.isFinite(tokenData.expires_in) || !tokenData.expires_in) return fail(url.origin, "linkedin_token_response_invalid");

    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: "Bearer " + tokenData.access_token }, cache: "no-store",
    });
    if (!profileResponse.ok) return fail(url.origin, "linkedin_profile_lookup_failed");
    const profile = await profileResponse.json() as { sub?: string; name?: string };
    if (!profile.sub) return fail(url.origin, "linkedin_profile_id_missing");

    const { error: saveError } = await supabase.from("social_connections").upsert({
      workspace_id: workspaceId, provider: "linkedin", provider_account_id: profile.sub,
      account_name: profile.name ?? null, encrypted_access_token: encryptSocialToken(tokenData.access_token),
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      scopes: (tokenData.scope ?? "").split(/[ ,]+/).filter(Boolean), connected_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,provider,provider_account_id" });
    if (saveError) return fail(url.origin, "linkedin_connection_save_failed");

    const response = NextResponse.redirect(new URL("/?integration=linkedin_connected", url.origin));
    response.cookies.delete("linkedin_oauth_state");
    response.cookies.delete("linkedin_oauth_workspace");
    return response;
  } catch {
    return fail(url.origin, "linkedin_connection_failed");
  }
}
