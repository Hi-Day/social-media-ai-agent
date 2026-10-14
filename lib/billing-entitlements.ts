import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === "active";
}

export async function enforceWorkspaceSubscription(
  _sessionClient: unknown,
  workspaceId: string,
): Promise<NextResponse | null> {
  if (process.env.BILLING_ENFORCEMENT_ENABLED !== "true") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({
      error: "Subscription verification is not configured",
      code: "subscription_verification_unavailable",
    }, { status: 503 });
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.from("workspace_subscriptions")
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
