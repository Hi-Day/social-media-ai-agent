import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "submit";

  const { data: draft, error: draftError } = await supabase
    .from("content_drafts")
    .select("id, workspace_id, status")
    .eq("id", id)
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (action === "submit") {
    if (!["draft", "rejected", "idea"].includes(draft.status)) {
      return NextResponse.json({ error: "Draft is not ready for approval." }, { status: 409 });
    }

    const { data: existingPending } = await supabase
      .from("approvals")
      .select("id, status")
      .eq("content_draft_id", draft.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ error: "Draft already has a pending approval." }, { status: 409 });
    }

    const { data: approval, error: approvalError } = await supabase
      .from("approvals")
      .insert({
        workspace_id: draft.workspace_id,
        content_draft_id: draft.id,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (approvalError) {
      return NextResponse.json({ error: approvalError.message }, { status: 500 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("content_drafts")
      .update({ status: "in_review", updated_at: new Date().toISOString() })
      .eq("id", draft.id)
      .select("id, workspace_id, title, platform, caption, status, created_at, updated_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ draft: updated, approval }, { status: 200 });
  }

  if (!["approve", "reject", "changes_requested"].includes(action)) {
    return NextResponse.json({ error: "Unsupported review action." }, { status: 400 });
  }

  const { data: reviewerMembership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", draft.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!reviewerMembership || !["owner", "admin"].includes(reviewerMembership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can review content." }, { status: 403 });
  }

  if (draft.status !== "in_review") {
    return NextResponse.json({ error: "Draft is not awaiting review." }, { status: 409 });
  }

  const nextDraftStatus = action === "approve"
    ? "approved"
    : action === "changes_requested"
      ? "draft"
      : "rejected";
  const nextApprovalStatus = action === "approve" ? "approved" : action;

  const { data: approval, error: approvalLookupError } = await supabase
    .from("approvals")
    .select("id, status")
    .eq("content_draft_id", draft.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (approvalLookupError) {
    return NextResponse.json({ error: approvalLookupError.message }, { status: 500 });
  }

  if (!approval) {
    return NextResponse.json({ error: "Pending approval not found." }, { status: 409 });
  }

  const { error: approvalUpdateError } = await supabase
    .from("approvals")
    .update({ status: nextApprovalStatus, reviewer_id: user.id })
    .eq("id", approval.id);

  if (approvalUpdateError) {
    return NextResponse.json({ error: approvalUpdateError.message }, { status: 500 });
  }

  const { data: updated, error: draftUpdateError } = await supabase
    .from("content_drafts")
    .update({ status: nextDraftStatus, updated_at: new Date().toISOString() })
    .eq("id", draft.id)
    .select("id, workspace_id, title, platform, caption, status, created_at, updated_at")
    .single();

  if (draftUpdateError) {
    return NextResponse.json({ error: draftUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ draft: updated, approval: { ...approval, status: nextApprovalStatus } });
}
