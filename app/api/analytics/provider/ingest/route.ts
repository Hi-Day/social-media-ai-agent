import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { decryptSocialToken } from "@/lib/social-token-crypto";
import { analyticsDayBucket, normalizeLinkedInSocialActions, type LinkedInSocialActions } from "@/lib/linkedin-analytics";

export const runtime = "nodejs";
const MAX_POSTS_PER_SYNC = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed: unknown = await request.json().catch(() => ({}));
  const body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

  const { data: membership, error: membershipError } = await supabase.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify workspace permissions" }, { status: 500 });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Provider analytics ingestion is not configured on the server" }, { status: 503 });
  }

  const { data: connection, error: connectionError } = await supabase.from("social_connections")
    .select("id, provider_account_id, encrypted_access_token, token_expires_at, scopes")
    .eq("workspace_id", workspaceId).eq("provider", "linkedin")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (connectionError) return NextResponse.json({ error: "Unable to load LinkedIn connection" }, { status: 500 });
  if (!connection) return NextResponse.json({ error: "LinkedIn account is not connected" }, { status: 409 });
  if (!connection.token_expires_at || !Number.isFinite(Date.parse(connection.token_expires_at)) || Date.parse(connection.token_expires_at) <= Date.now()) {
    return NextResponse.json({ error: "LinkedIn access token expired; reconnect the account" }, { status: 409 });
  }
  const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
  if (!scopes.includes("r_member_social_feed")) {
    return NextResponse.json({
      error: "LinkedIn read analytics scope is not granted to this connection.",
      requiredScope: "r_member_social_feed",
      status: "scope_required",
    }, { status: 409 });
  }

  let accessToken: string;
  try {
    accessToken = decryptSocialToken(connection.encrypted_access_token);
  } catch {
    return NextResponse.json({ error: "LinkedIn token decryption failed" }, { status: 500 });
  }

  const { data: publications, error: publicationsError } = await supabase.from("social_publications")
    .select("provider_post_id, completed_at, created_at")
    .eq("workspace_id", workspaceId).eq("provider", "linkedin").eq("status", "published")
    .not("provider_post_id", "is", null).order("completed_at", { ascending: false }).limit(MAX_POSTS_PER_SYNC);
  if (publicationsError) return NextResponse.json({ error: "Unable to load published LinkedIn posts" }, { status: 500 });
  if (!publications?.length) return NextResponse.json({ workspaceId, ingested: 0, postsChecked: 0, status: "no_published_posts" });

  const apiVersion = process.env.LINKEDIN_API_VERSION ?? "202601";
  const fetchedAt = new Date();
  const observedAt = analyticsDayBucket(fetchedAt);
  const admin = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let postsChecked = 0;
  let ingested = 0;
  let unavailable = 0;
  let providerRateLimited = false;

  for (const publication of publications) {
    if (!publication.provider_post_id) continue;
    let response: Response;
    try {
      response = await fetch("https://api.linkedin.com/rest/socialActions/" + encodeURIComponent(publication.provider_post_id), {
        headers: {
          Authorization: "Bearer " + accessToken,
          "LinkedIn-Version": apiVersion,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        cache: "no-store",
      });
    } catch {
      unavailable += 1;
      continue;
    }
    if (response.status === 429) {
      providerRateLimited = true;
      break;
    }
    if (!response.ok) {
      unavailable += 1;
      continue;
    }

    const payload = await response.json().catch(() => ({})) as LinkedInSocialActions;
    const metrics = normalizeLinkedInSocialActions(payload);
    postsChecked += 1;
    const rows = Object.entries(metrics).map(([metric_key, metric_value]) => ({
      workspace_id: workspaceId,
      provider: "linkedin",
      provider_account_id: connection.provider_account_id,
      provider_post_id: publication.provider_post_id!,
      metric_key,
      metric_value,
      observed_at: observedAt,
      fetched_at: fetchedAt.toISOString(),
      provider_api_version: apiVersion,
      evidence: { source: "linkedin_social_actions", snapshot: true },
    }));
    if (rows.length === 0) {
      unavailable += 1;
      continue;
    }
    const { error: saveError } = await admin.from("provider_analytics_observations").upsert(rows, {
      onConflict: "workspace_id,provider,provider_account_id,provider_post_id,metric_key,observed_at",
    });
    if (saveError) {
      return NextResponse.json({ error: "Unable to persist provider analytics observations" }, { status: 500 });
    }
    ingested += rows.length;
  }

  return NextResponse.json({
    workspaceId,
    provider: "linkedin",
    postsChecked,
    ingested,
    unavailable,
    status: providerRateLimited ? "rate_limited_partial" : "completed",
    fetchedAt: fetchedAt.toISOString(),
    note: "Only explicitly returned likes/comments are saved. Missing metrics are unavailable, not zero. Metrics are snapshots, not impressions or reach.",
  });
}
