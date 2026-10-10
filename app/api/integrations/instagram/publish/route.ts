import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSocialToken } from "@/lib/social-token-crypto";
import { isPublishableInstagramImageDraft, isSocialTokenExpired } from "@/lib/instagram-publish-guards";

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
    .select("id, workspace_id, platform, caption, status, media_url, media_status")
    .eq("id", draftId).eq("workspace_id", workspaceId).maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status !== "approved") return NextResponse.json({ error: "Only approved drafts can be published" }, { status: 409 });
  if (!isPublishableInstagramImageDraft(draft)) {
    return NextResponse.json({
      error: "Instagram image publishing requires an Instagram-targeted approved draft with generated media at a public HTTPS URL.",
    }, { status: 400 });
  }

  const { data: connection, error: connectionError } = await supabase.from("social_connections")
    .select("id, provider_account_id, encrypted_access_token, token_expires_at")
    .eq("workspace_id", workspaceId).eq("provider", "instagram")
    .order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (connectionError || !connection) return NextResponse.json({ error: "Instagram account is not connected" }, { status: 409 });
  if (isSocialTokenExpired(connection.token_expires_at)) {
    return NextResponse.json({ error: "Instagram access token expired; reconnect the account" }, { status: 409 });
  }

  let accessToken: string;
  try {
    accessToken = decryptSocialToken(connection.encrypted_access_token);
  } catch {
    return NextResponse.json({ error: "Instagram token decryption failed" }, { status: 500 });
  }

  const { data: publication, error: reservationError } = await supabase.from("social_publications")
    .insert({
      workspace_id: workspaceId,
      draft_id: draftId,
      provider: "instagram",
      status: "pending",
      initiated_by: auth.user.id,
    })
    .select("id")
    .single();

  if (reservationError || !publication) {
    if (reservationError?.code === "23505") {
      const { data: existing } = await supabase.from("social_publications")
        .select("status, provider_post_id")
        .eq("workspace_id", workspaceId).eq("draft_id", draftId).eq("provider", "instagram")
        .in("status", ["pending", "published", "unknown"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return NextResponse.json({
        error: existing?.status === "published"
          ? "This draft has already been published to Instagram"
          : existing?.status === "unknown"
            ? "The previous publish result is uncertain; verify Instagram before retrying"
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
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION ?? "v26.0";
  const baseUrl = "https://graph.instagram.com/" + apiVersion + "/" + encodeURIComponent(connection.provider_account_id);
  let containerId: string;

  try {
    const containerResponse = await fetch(baseUrl + "/media", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url: draft.media_url!,
        caption: draft.caption,
        access_token: accessToken,
      }),
      cache: "no-store",
    });
    if (!containerResponse.ok) {
      await updatePublication({
        status: containerResponse.status >= 500 ? "unknown" : "failed",
        provider_status_code: containerResponse.status,
        error_code: "INSTAGRAM_MEDIA_CONTAINER_FAILED",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ error: "Instagram could not prepare the image", publicationStatus: containerResponse.status >= 500 ? "unknown" : "failed" }, { status: 502 });
    }
    const container = await containerResponse.json() as { id?: string };
    if (!container.id) {
      await updatePublication({ status: "unknown", error_code: "INSTAGRAM_CONTAINER_ID_MISSING", updated_at: new Date().toISOString() });
      return NextResponse.json({ error: "Instagram returned no media container ID; verify account state before retrying", publicationStatus: "unknown" }, { status: 502 });
    }
    containerId = container.id;
  } catch {
    await updatePublication({ status: "unknown", error_code: "PROVIDER_OUTCOME_UNKNOWN", updated_at: new Date().toISOString() });
    return NextResponse.json({ error: "Instagram's media preparation result could not be confirmed", publicationStatus: "unknown" }, { status: 502 });
  }

  let publishResponse: Response;
  try {
    publishResponse = await fetch(baseUrl + "/media_publish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
      cache: "no-store",
    });
  } catch {
    await updatePublication({ status: "unknown", error_code: "PROVIDER_OUTCOME_UNKNOWN", updated_at: new Date().toISOString() });
    return NextResponse.json({ error: "Instagram's publish result could not be confirmed. Check the account before retrying.", publicationStatus: "unknown" }, { status: 502 });
  }

  if (!publishResponse.ok) {
    const rejected = publishResponse.status >= 400 && publishResponse.status < 500;
    await updatePublication({
      status: rejected ? "failed" : "unknown",
      provider_status_code: publishResponse.status,
      error_code: "INSTAGRAM_PUBLISH_FAILED",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: "Instagram publish failed", publicationStatus: rejected ? "failed" : "unknown", retryAllowed: rejected }, { status: 502 });
  }

  const result = await publishResponse.json() as { id?: string };
  if (!result.id) {
    await updatePublication({ status: "unknown", error_code: "INSTAGRAM_POST_ID_MISSING", updated_at: new Date().toISOString() });
    return NextResponse.json({ error: "Instagram accepted the request but returned no post ID; verify the feed before retrying", publicationStatus: "unknown" }, { status: 502 });
  }
  const auditSaved = await updatePublication({
    status: "published",
    provider_post_id: result.id,
    provider_status_code: publishResponse.status,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({
    published: true,
    provider: "instagram",
    postId: result.id,
    publicationStatus: auditSaved ? "published" : "accepted_audit_update_pending",
  }, { status: 201 });
}
