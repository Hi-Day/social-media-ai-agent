import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getContext() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { supabase, user: null };
  return { supabase, user: userData.user };
}

async function getWorkspaceAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, workspaceId: string) {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function GET(request: Request) {
  const { supabase, user } = await getContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const membership = await getWorkspaceAccess(supabase, user.id, workspaceId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: brand, error } = await supabase
    .from("brands")
    .select("id, workspace_id, name, voice, description, audience, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brand: brand ?? null, role: membership.role });
}

export async function PUT(request: Request) {
  const { supabase, user } = await getContext();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const membership = await getWorkspaceAccess(supabase, user.id, workspaceId);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can update the Brand Brain." }, { status: 403 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const voice = typeof body.voice === "string" ? body.voice.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const audience = typeof body.audience === "string" ? body.audience.trim() : "";

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Brand name must be between 2 and 120 characters." }, { status: 400 });
  }
  if (voice.length > 4000 || description.length > 4000 || audience.length > 2000) {
    return NextResponse.json({ error: "Brand Brain fields are too long." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const payload = { name, voice: voice || null, description: description || null, audience: audience || null };
  const query = existing
    ? supabase.from("brands").update(payload).eq("id", existing.id)
    : supabase.from("brands").insert({ workspace_id: workspaceId, ...payload });

  const { data: brand, error } = await query
    .select("id, workspace_id, name, voice, description, audience, created_at")
    .single();

  if (error || !brand) return NextResponse.json({ error: error?.message || "Unable to save Brand Brain." }, { status: 500 });
  return NextResponse.json({ brand });
}
