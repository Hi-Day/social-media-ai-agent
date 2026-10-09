import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSocialToken } from "@/lib/social-token-crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const draftId = typeof body.draftId === "string" ? body.draftId : "";
  if (!workspaceId || !draftId) return NextResponse.json({ error: "workspaceId and draftId are required" }, { status: 400 });

  const { data: membership } = await supabase.from("workspace_members").select("role")
    .eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });

  const { data: draft, error: draftError } = await supabase.from("content_drafts")
    .select("id, workspace_id, platform, caption, status").eq("id", draftId).eq("workspace_id", workspaceId).maybeSingle();
  if (draftError || !draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft.status !== "approved") return NextResponse.json({ error: "Only approved drafts can be published" }, { status: 409 });
  if (!draft.caption?.trim() || !/(linkedin|multi-platform)/i.test(draft.platform ?? "")) return NextResponse.json({ error: "Draft must contain text and target LinkedIn" }, { status: 400 });

  const { data: connection, error: connectionError } = await supabase.from("social_connections")
    .select("id, provider_account_id, encrypted_access_token, token_expires_at")
    .eq("workspace_id", workspaceId).eq("provider", "linkedin").order("connected_at", { ascending: false }).limit(1).maybeSingle();
  if (connectionError || !connection) return NextResponse.json({ error: "LinkedIn account is not connected" }, { status: 409 });
  if (new Date(connection.token_expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "LinkedIn access token expired; reconnect the account" }, { status: 409 });

  try {
    const accessToken = decryptSocialToken(connection.encrypted_access_token);
    const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
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
    if (!postResponse.ok) return NextResponse.json({ error: "LinkedIn publish failed", providerStatus: postResponse.status }, { status: 502 });
    return NextResponse.json({ published: true, provider: "linkedin", postId: postResponse.headers.get("x-restli-id") }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "SOCIAL_TOKEN_DECRYPTION_FAILED";
    return NextResponse.json({ error: code.includes("SOCIAL_TOKEN") ? code : "LinkedIn publishing failed" }, { status: 500 });
  }
}
