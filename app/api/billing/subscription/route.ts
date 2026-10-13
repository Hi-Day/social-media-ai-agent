import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership, error: membershipError } = await supabase.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify workspace permissions" }, { status: 500 });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }
  const { data, error } = await supabase.from("workspace_subscriptions")
    .select("id,plan_code,amount_idr,monthly_credit_limit,status,provider_session_id,provider_subscription_id,current_period_start,current_period_end,pending_expires_at,created_at,updated_at")
    .eq("workspace_id", workspaceId).in("status", ["pending","active","past_due","inactive","failed"])
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load subscription status" }, { status: 500 });
  const availablePlans = (["starter", "growth", "agency"] as const).flatMap((code) => {
    const prefix = "SOCIALOS_" + code.toUpperCase();
    const amountIdr = Number(process.env[prefix + "_PRICE_IDR"]);
    const monthlyCreditLimit = Number(process.env[prefix + "_MONTHLY_CREDITS"]);
    if (!Number.isSafeInteger(amountIdr) || amountIdr <= 0 || !Number.isFinite(monthlyCreditLimit) || monthlyCreditLimit <= 0) return [];
    return [{ code, amountIdr, monthlyCreditLimit }];
  });
  return NextResponse.json({ workspaceId, subscription: data ?? null, availablePlans });
}
