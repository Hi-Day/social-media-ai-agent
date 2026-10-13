import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PLAN_CODES = ["starter", "growth", "agency"] as const;
type PlanCode = (typeof PLAN_CODES)[number];

function readPlan(code: PlanCode) {
  const prefix = "SOCIALOS_" + code.toUpperCase();
  const amount = Number(process.env[prefix + "_PRICE_IDR"]);
  const monthlyCredits = Number(process.env[prefix + "_MONTHLY_CREDITS"]);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000) return null;
  if (!Number.isFinite(monthlyCredits) || monthlyCredits <= 0 || monthlyCredits > 1_000_000_000) return null;
  return { amount, monthlyCredits };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed: unknown = await request.json().catch(() => ({}));
  const body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const planCode = typeof body.planCode === "string" && PLAN_CODES.includes(body.planCode as PlanCode)
    ? body.planCode as PlanCode : null;
  if (!workspaceId || !planCode) return NextResponse.json({ error: "workspaceId and a valid planCode are required" }, { status: 400 });

  const { data: membership, error: membershipError } = await supabase.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", auth.user.id).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify workspace permissions" }, { status: 500 });
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Workspace owner/admin permission required" }, { status: 403 });
  }
  if (!auth.user.email) return NextResponse.json({ error: "A verified account email is required for billing" }, { status: 400 });

  const xenditKey = process.env.XENDIT_SECRET_API_KEY;
  const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const admin = adminClient();
  const plan = readPlan(planCode);
  if (!xenditKey || !webhookToken || !admin || !appUrl || !plan) {
    return NextResponse.json({ error: "Billing is not configured. Set Xendit credentials, HTTPS app URL, and server-side plan pricing/credits." }, { status: 503 });
  }
  let origin: URL;
  try { origin = new URL(appUrl); } catch { return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is invalid" }, { status: 503 }); }
  if (origin.protocol !== "https:") return NextResponse.json({ error: "Billing checkout requires an HTTPS app URL" }, { status: 503 });

  const { data: current, error: currentError } = await admin.from("workspace_subscriptions")
    .select("id,status,created_at,pending_expires_at")
    .eq("workspace_id", workspaceId).in("status", ["pending", "active", "past_due"]).maybeSingle();
  if (currentError) return NextResponse.json({ error: "Unable to check existing subscription" }, { status: 500 });
  if (current?.status === "active" || current?.status === "past_due") {
    return NextResponse.json({ error: "Workspace already has a subscription that must be managed before starting another" }, { status: 409 });
  }
  if (current?.status === "pending") {
    const expiresAt = Date.parse(current.pending_expires_at ?? "");
    if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
      return NextResponse.json({ error: "A checkout is already pending for this workspace" }, { status: 409 });
    }
    await admin.from("workspace_subscriptions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", current.id);
  }

  const { data: subscription, error: insertError } = await admin.from("workspace_subscriptions").insert({
    workspace_id: workspaceId,
    initiated_by: auth.user.id,
    provider: "xendit",
    plan_code: planCode,
    amount_idr: plan.amount,
    monthly_credit_limit: plan.monthlyCredits,
    status: "pending",
  }).select("id").single();
  if (insertError || !subscription) {
    if (insertError?.code === "23505") return NextResponse.json({ error: "A subscription checkout is already active for this workspace" }, { status: 409 });
    return NextResponse.json({ error: "Unable to create subscription record" }, { status: 500 });
  }

  const nextMonth = new Date();
  const anchorDate = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 1)).toISOString();
  const fullName = typeof auth.user.user_metadata?.full_name === "string"
    ? auth.user.user_metadata.full_name.replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 80)
    : "";
  const givenNames = fullName || "SocialOS Customer";
  const payload = {
    reference_id: subscription.id,
    session_type: "SUBSCRIPTION",
    mode: "PAYMENT_LINK",
    amount: plan.amount,
    currency: "IDR",
    country: "ID",
    locale: "id",
    customer: {
      reference_id: auth.user.id,
      type: "INDIVIDUAL",
      email: auth.user.email,
      individual_detail: { given_names: givenNames },
    },
    description: "SocialOS " + planCode + " monthly subscription",
    subscription: {
      schedule: {
        interval: "MONTH",
        interval_count: 1,
        anchor_date: anchorDate,
        retry_interval: "DAY",
        retry_interval_count: 1,
        total_retry: 3,
        failed_attempt_notifications: [1, 3],
      },
      failed_cycle_action: "STOP",
    },
    success_return_url: new URL("/billing/return?result=complete", origin).toString(),
    cancel_return_url: new URL("/billing/return?result=cancelled", origin).toString(),
    metadata: { workspace_id: workspaceId, subscription_id: subscription.id, plan_code: planCode },
  };

  let response: Response;
  try {
    response = await fetch("https://api.xendit.co/sessions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(xenditKey + ":").toString("base64"),
        "Content-Type": "application/json",
        "api-version": "2026-01-01",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    await admin.from("workspace_subscriptions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", subscription.id);
    return NextResponse.json({ error: "Unable to reach billing provider" }, { status: 502 });
  }

  const result = await response.json().catch(() => ({})) as {
    payment_session_id?: string; payment_link_url?: string; recurring_plan_id?: string; status?: string;
  };
  if (!response.ok || !result.payment_session_id || !result.payment_link_url || !result.payment_link_url.startsWith("https://")) {
    await admin.from("workspace_subscriptions").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", subscription.id);
    return NextResponse.json({ error: "Billing provider did not create a valid checkout session" }, { status: 502 });
  }

  const { error: saveError } = await admin.from("workspace_subscriptions").update({
    provider_session_id: result.payment_session_id,
    provider_subscription_id: result.recurring_plan_id ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", subscription.id);
  if (saveError) return NextResponse.json({ error: "Checkout created but local state could not be updated; contact support before retrying" }, { status: 500 });

  return NextResponse.json({
    subscriptionId: subscription.id,
    status: "pending",
    checkoutUrl: result.payment_link_url,
    note: "Paid access is not activated by this redirect. Wait for a verified Xendit webhook.",
  });
}
