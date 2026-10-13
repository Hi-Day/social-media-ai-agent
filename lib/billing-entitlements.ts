import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === "active";
}

export async function enforceWorkspaceSubscription(
  supabase: SupabaseServerClient,
  workspaceId: string,
): Promise<NextResponse | null> {
  if (process.env.BILLING_ENFORCEMENT_ENABLED !== "true") return null;

  const { data, error } = await supabase.from("workspace_subscriptions")
    .select("status,plan_code").eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    return NextResponse.json({
      error: "Unable to verify subscription entitlement",
      code: "subscription_verification_unavailable",
    }, { status: 503 });
  }
  if (!isSubscriptionActive(data?.status)) {
    return NextResponse.json({
      error: "An active subscription is required for billable operations",
      code: "subscription_required",
      subscriptionStatus: data?.status ?? "none",
    }, { status: 402 });
  }
  return null;
}
