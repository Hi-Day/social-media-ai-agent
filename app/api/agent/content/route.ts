import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaption } from "@/lib/agent";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";

    if (idea.length < 3 || idea.length > 4000) {
      return NextResponse.json({ error: "Idea must be between 3 and 4000 characters." }, { status: 400 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: brand } = await supabase
      .from("brands")
      .select("name, voice, description, audience")
      .eq("workspace_id", workspaceId)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    const caption = await generateCaption(idea, brand ?? {});

    return NextResponse.json({
      caption,
      mode: process.env.OPENROUTER_API_KEY ? "live" : "demo",
      brand: brand?.name ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
