import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateBudgetHealth } from "@/lib/commercial-controls";

async function getUserAndRole(supabase: Awaited<ReturnType<typeof createClient>>, workspaceId: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return { user: null, role: null, error: "Unauthorized" as const };

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return { user: auth.user, role: null, error: "Unable to verify workspace permissions." as const };
  if (!membership) return { user: auth.user, role: null, error: "Forbidden" as const };
  return { user: auth.user, role: membership.role as string, error: null };
}

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });

  const supabase = await createClient();
  const context = await getUserAndRole(supabase, workspaceId);
  if (!context.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.error) return NextResponse.json({ error: context.error }, { status: context.error === "Forbidden" ? 403 : 500 });

  const { data, error } = await supabase.rpc("get_workspace_usage_budget", { p_workspace_id: workspaceId });
  if (error) return NextResponse.json({ error: "Unable to load budget status. Confirm the workspace budget migration has been applied." }, { status: 500 });
  const budget = Array.isArray(data) ? data[0] : data;
  const health = budget ? evaluateBudgetHealth({
    monthlyLimit: budget.monthly_credit_limit == null ? null : Number(budget.monthly_credit_limit),
    usedCredits: Number(budget.used_credits ?? 0),
    reservedCredits: Number(budget.reserved_credits ?? 0),
    hardLimit: Boolean(budget.hard_limit),
    configured: Boolean(budget.budget_configured),
  }) : evaluateBudgetHealth({ monthlyLimit: null, usedCredits: 0, reservedCredits: 0, hardLimit: false, configured: false });
  return NextResponse.json({ workspaceId, budget: budget ?? null, health, editable: ["owner", "admin"].includes(context.role ?? "") });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const monthlyCreditLimit = typeof body.monthlyCreditLimit === "number" ? body.monthlyCreditLimit : Number(body.monthlyCreditLimit);
  const hardLimit = typeof body.hardLimit === "boolean" ? body.hardLimit : true;

  if (!workspaceId || !Number.isFinite(monthlyCreditLimit) || monthlyCreditLimit <= 0 || monthlyCreditLimit > 1_000_000_000) {
    return NextResponse.json({ error: "Provide a monthly credit limit greater than 0 and no more than 1,000,000,000." }, { status: 400 });
  }

  const supabase = await createClient();
  const context = await getUserAndRole(supabase, workspaceId);
  if (!context.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.error) return NextResponse.json({ error: context.error }, { status: context.error === "Forbidden" ? 403 : 500 });
  if (!["owner", "admin"].includes(context.role ?? "")) {
    return NextResponse.json({ error: "Only workspace owners and admins can change the usage budget." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("workspace_usage_budgets")
    .upsert({
      workspace_id: workspaceId,
      monthly_credit_limit: monthlyCreditLimit,
      hard_limit: hardLimit,
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" })
    .select("workspace_id,monthly_credit_limit,hard_limit,updated_at")
    .single();

  if (error) return NextResponse.json({ error: "Unable to save the workspace usage budget." }, { status: 500 });
  return NextResponse.json({ budget: data });
}
