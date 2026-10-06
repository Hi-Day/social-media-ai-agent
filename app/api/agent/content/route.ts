import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaption } from "@/lib/agent";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: claims, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claims?.claims?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";

    if (idea.length < 3 || idea.length > 4000) {
      return NextResponse.json(
        { error: "Idea must be between 3 and 4000 characters." },
        { status: 400 },
      );
    }

    const caption = await generateCaption(idea);

    return NextResponse.json({
      caption,
      mode: process.env.OPENROUTER_API_KEY ? "live" : "demo",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
