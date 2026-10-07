import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chooseAutomaticModel, estimateCredits, getProfile, profilesFor, type Capability, type ModelCodename } from "@/lib/model-registry";

const PACKAGES = {
  starter: {
    name: "Starter",
    description: "Efficient coverage for testing and always-on content.",
    items: [
      ["Instagram","Carousel","image",2,"core"],
      ["Instagram","Reel","video",1,"supporting"],
      ["Instagram","Story","image",4,"supporting"],
      ["LinkedIn","Post","text",2,"core"],
    ],
  },
  growth: {
    name: "Growth",
    description: "Balanced multi-platform campaign coverage.",
    items: [
      ["Instagram","Carousel","image",3,"core"],
      ["Instagram","Reel","video",3,"core"],
      ["Instagram","Story","image",8,"supporting"],
      ["TikTok","Short Video","video",2,"core"],
      ["LinkedIn","Post","text",3,"core"],
    ],
  },
  signature: {
    name: "Signature",
    description: "Premium creative treatment for important launches.",
    items: [
      ["Instagram","Hero Reel","video",1,"hero"],
      ["Instagram","Reel","video",4,"core"],
      ["Instagram","Carousel","image",4,"core"],
      ["Instagram","Story","image",10,"supporting"],
      ["TikTok","Short Video","video",3,"core"],
      ["LinkedIn","Post","text",4,"core"],
    ],
  },
} as const;

type PackageCode = keyof typeof PACKAGES;
type Importance = "supporting" | "core" | "hero";

type WorkspacePolicy = { capability: Capability; default_codename: ModelCodename; enabled_codenames: ModelCodename[] };

function chooseWithPolicy(
  capability: Capability,
  importance: Importance,
  budget: "economy" | "balanced" | "premium",
  policy?: WorkspacePolicy,
) {
  const automatic = chooseAutomaticModel(capability, importance, budget);
  if (!policy) return automatic;

  const enabled = profilesFor(capability).filter((profile) => policy.enabled_codenames.includes(profile.codename));
  if (!enabled.length) return automatic;

  const preferred = enabled.find((profile) => profile.codename === policy.default_codename);
  if (preferred) return preferred;

  return enabled
    .slice()
    .sort((a, b) => b.quality - a.quality || b.speed - a.speed || a.credits - b.credits)[0] ?? automatic;
}

function makePackage(
  code: PackageCode,
  mode: "automatic" | "manual",
  overrides: Record<string, ModelCodename>,
  policies: WorkspacePolicy[],
) {
  const template = PACKAGES[code];
  const items = template.items.map(([platform, type, capability, count, importance]) => {
    const cap = capability as Capability;
    const imp = importance as Importance;
    const budget = code === "starter" ? "economy" : code === "growth" ? "balanced" : "premium";
    const policy = policies.find((item) => item.capability === cap);
    const auto = chooseWithPolicy(cap, imp, budget, policy);
    const requested = mode === "manual" && overrides[cap] ? overrides[cap] : undefined;
    if (requested && policy && !policy.enabled_codenames.includes(requested)) {
      throw new Error(`Model ${requested} is disabled for ${cap} in this workspace.`);
    }
    const codename = requested ?? auto.codename;
    const selected = chooseWithPolicy(cap, imp, budget, policy);
    const credits = codename === selected.codename ? selected.credits : chooseAutomaticModel(cap, imp, "premium").credits;
    return { platform, type, capability: cap, count, importance: imp, codename, credits_per_asset: credits };
  });
  const estimatedCredits = estimateCredits(items.map((item) => ({ capability: item.capability, count: item.count, codename: item.codename })));
  const duration = Math.max(10, Math.ceil(items.reduce((sum, item) => sum + item.count * (item.capability === "video" ? 6 : item.capability === "image" ? 2 : 0.5), 0)));
  return {
    code, name: template.name, description: template.description, content_plan: items,
    model_policy: { mode, assignments: items.map((item) => ({ capability: item.capability, codename: item.codename })) },
    estimated_credits: Math.round(estimatedCredits * 100) / 100,
    estimated_duration_minutes: duration,
    recommended: code === "growth",
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";
    const audience = typeof body.audience === "string" ? body.audience.trim() : "";
    const mode = body.modelMode === "manual" ? "manual" : "automatic";
    const overrides = body.modelOverrides && typeof body.modelOverrides === "object" ? body.modelOverrides : {};
    if (!workspaceId || name.length < 2 || objective.length < 3) {
      return NextResponse.json({ error: "workspaceId, campaign name and objective are required." }, { status: 400 });
    }
    const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: policyRows, error: policyError } = await supabase
      .from("workspace_model_policies")
      .select("capability,default_codename,enabled_codenames")
      .eq("workspace_id", workspaceId);
    if (policyError && policyError.code !== "42P01") {
      return NextResponse.json({ error: policyError.message }, { status: 500 });
    }

    const policies = (policyRows ?? []).map((row) => ({
      capability: row.capability as Capability,
      default_codename: row.default_codename as ModelCodename,
      enabled_codenames: Array.isArray(row.enabled_codenames)
        ? row.enabled_codenames.filter((value): value is ModelCodename => typeof value === "string")
        : [],
    }));

    const packages = (["starter", "growth", "signature"] as PackageCode[]).map((code) =>
      makePackage(code, mode, overrides, policies),
    );
    const { data: campaign, error } = await supabase.from("campaigns").insert({
      workspace_id: workspaceId, name, objective, audience: audience || null, status: "planning",
      plan: { model_mode: mode, packages },
    }).select("id,workspace_id,name,objective,audience,status,plan,created_at,updated_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: packageError } = await supabase.from("content_packages").insert(packages.map((pkg) => ({
      campaign_id: campaign.id, workspace_id: workspaceId, code: pkg.code, name: pkg.name,
      description: pkg.description, content_plan: pkg.content_plan, model_policy: pkg.model_policy,
      estimated_credits: pkg.estimated_credits, estimated_duration_minutes: pkg.estimated_duration_minutes,
      recommended: pkg.recommended,
    })));
    if (packageError) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      return NextResponse.json({ error: packageError.message }, { status: 500 });
    }
    return NextResponse.json({ campaign, packages }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign planning failed." }, { status: 500 });
  }
}