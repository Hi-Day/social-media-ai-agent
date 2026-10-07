import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODEL_PROFILES, type Capability, type ModelCodename } from "@/lib/model-registry";

const CAPABILITIES: Capability[] = ["text", "image", "video", "voice", "stt"];
const CODENAMES = ["Swift", "Balance", "Pro", "Studio", "Cinematic"] as const;

function defaultsFor(capability: Capability) {
  return MODEL_PROFILES
    .filter((profile) => profile.capability === capability)
    .map((profile) => profile.codename);
}

function normalizePolicy(capability: Capability, row?: { default_codename: string; enabled_codenames: unknown }) {
  const available = defaultsFor(capability);
  const enabled = Array.isArray(row?.enabled_codenames)
    ? row.enabled_codenames.filter((value): value is ModelCodename =>
        typeof value === "string" && available.includes(value as ModelCodename)
      )
    : available;

  const safeEnabled = enabled.length ? [...new Set(enabled)] : available;
  const defaultCodename =
    typeof row?.default_codename === "string" &&
    safeEnabled.includes(row.default_codename as ModelCodename)
      ? row.default_codename
      : safeEnabled[0];

  return { capability, default_codename: defaultCodename, enabled_codenames: safeEnabled };
}

async function getContext(workspaceId: string) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { supabase, user: null, role: null };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return { supabase, user: auth.user, role: membership?.role ?? null };
}

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const { supabase, user, role } = await getContext(workspaceId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: rows, error } = await supabase
    .from("workspace_model_policies")
    .select("capability,default_codename,enabled_codenames")
    .eq("workspace_id", workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byCapability = new Map((rows ?? []).map((row) => [row.capability, row]));
  const policies = CAPABILITIES.map((capability) => normalizePolicy(capability, byCapability.get(capability)));

  return NextResponse.json({
    editable: role === "owner" || role === "admin",
    policies,
    profiles: MODEL_PROFILES.filter((profile) => CAPABILITIES.includes(profile.capability)),
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const policies = Array.isArray(body.policies) ? body.policies : [];

  if (!workspaceId || policies.length === 0) {
    return NextResponse.json({ error: "workspaceId and policies are required." }, { status: 400 });
  }

  const { supabase, user, role } = await getContext(workspaceId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Only workspace owners and admins can change model policy." }, { status: 403 });
  }

  const normalized = policies.map((item) => {
    const capability = item?.capability as Capability;
    if (!CAPABILITIES.includes(capability)) throw new Error(`Unsupported capability: ${capability}`);
    const available = defaultsFor(capability);
    const enabled = Array.isArray(item?.enabled_codenames)
      ? [...new Set(item.enabled_codenames.filter((value: unknown): value is ModelCodename =>
          typeof value === "string" && available.includes(value as ModelCodename)
        ))]
      : [];

    if (!enabled.length) throw new Error(`${capability} must keep at least one model enabled.`);
    const defaultCodename = typeof item?.default_codename === "string" ? item.default_codename : "";
    if (!enabled.includes(defaultCodename as ModelCodename)) {
      throw new Error(`${capability} default model must be enabled.`);
    }

    return { workspace_id: workspaceId, capability, default_codename: defaultCodename, enabled_codenames: enabled, updated_at: new Date().toISOString() };
  });

  const unique = new Map(normalized.map((item) => [item.capability, item]));
  const { error } = await supabase
    .from("workspace_model_policies")
    .upsert([...unique.values()], { onConflict: "workspace_id,capability" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policies: [...unique.values()].map((row) => ({
    capability: row.capability,
    default_codename: row.default_codename,
    enabled_codenames: row.enabled_codenames,
  })) });
}
