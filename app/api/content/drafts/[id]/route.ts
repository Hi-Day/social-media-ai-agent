import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const title = typeof body.idea === "string" ? body.idea.trim() : "";
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform.trim() : "Multi-platform";

  if (!workspaceId || title.length < 3 || caption.length < 3 || caption.length > 10000 || platform.length > 40) {
    return NextResponse.json(
      { error: "workspaceId, an idea of at least 3 characters, and a caption between 3 and 10000 characters are required." },
      { status: 400 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify workspace permissions." }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: existing, error: existingError } = await supabase
    .from("content_drafts")
    .select("id, status")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "Unable to load draft." }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  if (!["draft", "rejected"].includes(existing.status)) {
    return NextResponse.json({ error: "Only draft or rejected content can be edited." }, { status: 409 });
  }

  const { data: draft, error: updateError } = await supabase
    .from("content_drafts")
    .update({
      title: title.slice(0, 120),
      caption,
      platform,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("status", existing.status)
    .select("id, workspace_id, title, platform, caption, status, created_at, updated_at")
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: "Unable to save draft changes." }, { status: 500 });
  if (!draft) return NextResponse.json({ error: "Draft status changed. Reload and try again." }, { status: 409 });
  return NextResponse.json({ draft });
}
