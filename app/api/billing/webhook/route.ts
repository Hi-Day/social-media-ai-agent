import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type WebhookPayload = {
  event?: unknown;
  created?: unknown;
  data?: Record<string, unknown>;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
  const providedToken = request.headers.get("x-callback-token") ?? "";
  if (!expectedToken || !providedToken || !safeEqual(expectedToken, providedToken)) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }
  const rawBody = await request.text();
  let payload: WebhookPayload;
  try { payload = JSON.parse(rawBody) as WebhookPayload; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const event = typeof payload.event === "string" ? payload.event : "";
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};
  const referenceId = typeof data.reference_id === "string" ? data.reference_id : "";
  const resourceId = typeof data.id === "string" ? data.id : typeof data.recurring_plan_id === "string" ? data.recurring_plan_id : "";
  const created = typeof payload.created === "string" ? payload.created : "";
  if (!event || !resourceId || !created) return NextResponse.json({ error: "Webhook event, resource id, and created timestamp are required" }, { status: 400 });

  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Billing webhook is not configured" }, { status: 503 });
  const eventId = (event + ":" + resourceId + ":" + created).slice(0, 255);
  const hash = createHash("sha256").update(rawBody).digest("hex");
  const { data: eventRow, error: eventError } = await admin.from("billing_webhook_events").insert({
    provider: "xendit",
    event_id: eventId,
    event_type: event,
    reference_id: referenceId || null,
    provider_resource_id: resourceId,
    payload_sha256: hash,
    processing_status: "received",
  }).select("id").maybeSingle();

  if (eventError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (eventError || !eventRow) return NextResponse.json({ error: "Unable to record webhook event" }, { status: 500 });

  let query = admin.from("workspace_subscriptions").select("id,workspace_id,amount_idr,monthly_credit_limit,status,provider_subscription_id");
  if (referenceId) query = query.eq("id", referenceId);
  else if (resourceId) query = query.eq("provider_subscription_id", resourceId);
  const { data: subscription, error: subscriptionError } = await query.maybeSingle();
  if (subscriptionError || !subscription) {
    await admin.from("billing_webhook_events").update({
      processing_status: "ignored", error_code: "subscription_not_found", processed_at: new Date().toISOString(),
    }).eq("id", eventRow.id);
    return NextResponse.json({ received: true, processed: false });
  }

  const amount = typeof data.amount === "number" ? data.amount : Number(data.amount);
  const currency = typeof data.currency === "string" ? data.currency : "";
  const requiresAmountCheck = event === "recurring.plan.activated" || event === "recurring.cycle.succeeded";
  if (requiresAmountCheck && (!Number.isFinite(amount) || amount !== Number(subscription.amount_idr) || currency !== "IDR")) {
    await admin.from("billing_webhook_events").update({
      processing_status: "rejected", error_code: "amount_or_currency_mismatch", processed_at: new Date().toISOString(),
    }).eq("id", eventRow.id);
    return NextResponse.json({ received: true, processed: false });
  }

  let nextStatus: "active" | "past_due" | "inactive" | null = null;
  if (event === "recurring.plan.activated" || event === "recurring.cycle.succeeded") nextStatus = "active";
  else if (event === "recurring.cycle.retrying" || event === "recurring.cycle.failed" || event === "recurring.cycle.force_attempt_failed") nextStatus = "past_due";
  else if (event === "recurring.plan.inactivated") nextStatus = "inactive";

  if (!nextStatus) {
    await admin.from("billing_webhook_events").update({
      processing_status: "ignored", processed_at: new Date().toISOString(),
    }).eq("id", eventRow.id);
    return NextResponse.json({ received: true, processed: false });
  }

  const nextExecution = typeof data.next_execution_at === "string" ? data.next_execution_at
    : data.schedule && typeof data.schedule === "object" && typeof (data.schedule as Record<string, unknown>).next_execution_at === "string"
      ? (data.schedule as Record<string, string>).next_execution_at : null;
  const now = new Date().toISOString();
  const planId = typeof data.id === "string" && data.id.startsWith("repl_") ? data.id
    : typeof data.recurring_plan_id === "string" ? data.recurring_plan_id
    : subscription.provider_subscription_id;
  const { error: updateError } = await admin.from("workspace_subscriptions").update({
    status: nextStatus,
    provider_subscription_id: planId,
    current_period_start: nextStatus === "active" ? now : undefined,
    current_period_end: nextStatus === "active" ? nextExecution : undefined,
    updated_at: now,
  }).eq("id", subscription.id);
  if (updateError) {
    await admin.from("billing_webhook_events").update({
      processing_status: "failed", error_code: "subscription_update_failed", processed_at: now,
    }).eq("id", eventRow.id);
    return NextResponse.json({ error: "Unable to update subscription state" }, { status: 500 });
  }

  if (nextStatus === "active") {
    const { error: budgetError } = await admin.from("workspace_usage_budgets").upsert({
      workspace_id: subscription.workspace_id,
      monthly_credit_limit: subscription.monthly_credit_limit,
      hard_limit: true,
      updated_by: null,
      updated_at: now,
    }, { onConflict: "workspace_id" });
    if (budgetError) {
      await admin.from("billing_webhook_events").update({
        processing_status: "failed", error_code: "entitlement_budget_update_failed", processed_at: now,
      }).eq("id", eventRow.id);
      return NextResponse.json({ error: "Subscription active but budget entitlement could not be updated" }, { status: 500 });
    }
  }

  await admin.from("billing_webhook_events").update({
    processing_status: "processed", processed_at: now,
  }).eq("id", eventRow.id);
  return NextResponse.json({ received: true, processed: true, status: nextStatus });
}
