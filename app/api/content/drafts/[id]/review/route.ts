import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "submit";

  const { data, error } = await supabase.rpc("review_content_draft", {
    p_draft_id: id,
    p_action: action,
  });

  if (error) {
    const status =
      error.code === "42501" ? 403 :
      error.code === "P0002" ? 404 :
      error.code === "23505" || error.code === "23514" ? 409 :
      error.code === "22023" ? 400 : 500;

    return NextResponse.json({ error: error.message }, { status });
  }

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id, workspace_id, title, platform, caption, status, created_at, updated_at")
    .eq("id", id)
    .single();

  if (draftError) {
    return NextResponse.json({ error: draftError.message }, { status: 500 });
  }

  const approvalId = data?.approval_id;
  const { data: approval, error: approvalError } = approvalId
    ? await supabase.from("approvals").select("id,status,created_at").eq("id", approvalId).single()
    : { data: null, error: null };

  if (approvalError) {
    return NextResponse.json({ error: approvalError.message }, { status: 500 });
  }

  return NextResponse.json({ draft, approval });
}
