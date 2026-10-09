import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSocialToken } from "@/lib/social-token-crypto";
import { isPublishableLinkedInDraft, isSocialTokenExpired } from "@/lib/linkedin-publish-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedBody: unknown = await request.json().catch(() => ({}));
  const body = parsedBody && typeof parsedBody === "object" ? parsedBody as Record<string, unknown> : {};
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const draftId = typeof body.draftId === "string" ? body.draftId : "";
  if (!workspaceId || !draftId) return NextResponse.json({ error: "workspaceId and draftId are required" }, { status: 400 });

  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }

  const { data: draft, error: draftError } = await supabase.from("content_drafts")
    .select("id, workspace_id, platform, caption, status").eq("id", draftId).eq("workspace_id", workspaceId).maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status !== "approved") return NextResponse.json({ error: "Only approved drafts can be published" }, { status: 409 });
  if (!isPublishableLinkedInDraft(draft)) {
    return NextResponse.json({ error: "Draft must contain text and target LinkedIn" }, { status: 400 });
  }

  const { data: connection, error: connectionError } = await supabase.from("social_connections")
    .select("id, provider_account_id, encrypted_access_token, token_expires_at")
    .eq("workspace_id", workspaceId).eq("provider", "linkedin")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (connectionError || !connection) return NextResponse.json({ error: "LinkedIn account is not connected" }, { status: 409 });
  if (isSocialTokenExpired(connection.token_expires_at)) {
    return NextResponse.json({ error: "LinkedIn access token expired; reconnect the account" }, { status: 409 });
  }

  let accessToken: string;
  try {
    accessToken = decryptSocialToken(connection.encrypted_access_token);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SOCIAL_TOKEN_DECRYPTION_FAILED";
    return NextResponse.json({ error: code.includes("SOCIAL_TOKEN") ? code : "LinkedIn token decryption failed" }, { status: 500 });
  }

  // Reserve the draft/provider pair before contacting LinkedIn. A partial unique index
  // prevents concurrent requests and retries from creating duplicate public posts.
  const { data: publication, error: reservationError } = await supabase.from("social_publications")
    .insert({
      workspace_id: workspaceId,
      draft_id: draftId,
      provider: "linkedin",
      status: "pending",
      initiated_by: auth.user.id,
    })
    .select("id")
    .single();

  if (reservationError || !publication) {
    if (reservationError?.code === "23505") {
      const { data: existing } = await supabase.from("social_publications")
        .select("status, provider_post_id, created_at")
        .eq("workspace_id", workspaceId).eq("draft_id", draftId).eq("provider", "linkedin")
        .in("status", ["pending", "published", "unknown"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return NextResponse.json({
        error: existing?.status === "published"
          ? "This draft has already been published to LinkedIn"
          : existing?.status === "unknown"
            ? "The previous publish result is uncertain; verify LinkedIn before retrying"
            : "A publish attempt for this draft is already in progress",
        publicationStatus: existing?.status ?? "pending",
        postId: existing?.provider_post_id ?? null,
      }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to reserve a publication attempt" }, { status: 500 });
  }

  const updatePublication = async (values: Record<string, unknown>) => {
    const { error } = await supabase.from("social_publications").update(values).eq("id", publication.id);
    return !error;
  };

  let postResponse: Response;
  try {
    postResponse = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        "LinkedIn-Version": process.env.LINKEDIN_API_VERSION ?? "202601",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: "urn:li:person:" + connection.provider_account_id,
        commentary: draft.caption,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
      cache: "no-store",
    });
  } catch {
    // A network error can happen after LinkedIn accepted the post. Keep the reservation
    // in an ambiguous state so a retry cannot silently create a duplicate.
    await updatePublication({ status: "unknown", error_code: "PROVIDER_OUTCOME_UNKNOWN", updated_at: new Date().toISOString() });
    return NextResponse.json({
      error: "LinkedIn's response could not be confirmed. Check the LinkedIn feed before retrying.",
      publicationStatus: "unknown",
    }, { status: 502 });
  }

  if (!postResponse.ok) {
    const definitelyRejected = postResponse.status >= 400 && postResponse.status < 500;
    await updatePublication({
      status: definitelyRejected ? "failed" : "unknown",
      provider_status_code: postResponse.status,
      error_code: definitelyRejected ? "LINKEDIN_REJECTED_REQUEST" : "PROVIDER_OUTCOME_UNKNOWN",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({
      error: "LinkedIn publish failed",
      providerStatus: postResponse.status,
      publicationStatus: definitelyRejected ? "failed" : "unknown",
      retryAllowed: definitelyRejected,
    }, { status: 502 });
  }

  const postId = postResponse.headers.get("x-restli-id");
  if (!postId) {
    await updatePublication({
      status: "unknown",
      provider_status_code: postResponse.status,
      error_code: "PROVIDER_POST_ID_MISSING",
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({
      error: "LinkedIn accepted the request but returned no post ID. Verify the feed before retrying.",
      publicationStatus: "unknown",
    }, { status: 502 });
  }

  const auditSaved = await updatePublication({
    status: "published",
    provider_post_id: postId,
    provider_status_code: postResponse.status,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // LinkedIn already accepted the post. Never report it as failed just because audit
  // persistence failed; the reservation remains and blocks duplicate publication.
  return NextResponse.json({
    published: true,
    provider: "linkedin",
    postId,
    publicationStatus: auditSaved ? "published" : "accepted_audit_update_pending",
  }, { status: 201 });
}
