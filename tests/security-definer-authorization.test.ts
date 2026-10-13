import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (name: string) => readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8");

describe("exposed SECURITY DEFINER authorization contracts", () => {
  it("limits audit RPC writes to authenticated workspace members and validated persisted events", () => {
    const sql = read("20261009000700_learning_audit_integrity.sql");
    expect(sql).toContain("v_user_id uuid := (select auth.uid())");
    expect(sql).toContain("where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id");
    expect(sql).toContain("raise exception 'workspace_forbidden'");
    expect(sql).toContain("raise exception 'audit_event_state_mismatch'");
    expect(sql).toContain("v_role not in ('owner','admin')");
    expect(sql).toContain("jsonb_build_object('actor_user_id',v_user_id)");
    expect(sql).toMatch(/revoke all on function public\.append_audit_event\([^;]+\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.append_audit_event\([^;]+\) to authenticated/i);
  });

  it("requires owner/admin role, workspace-matched campaigns, and valid credit limits for reservations", () => {
    const sql = read("20261009001100_workspace_usage_budgets.sql");
    expect(sql).toContain("v_user_id uuid := (select auth.uid())");
    expect(sql).toContain("if v_role not in ('owner','admin') then raise exception 'campaign_execution_forbidden'");
    expect(sql).toContain("campaign_workspace_mismatch");
    expect(sql).toContain("p_credits is null or p_credits < 0");
    expect(sql).toContain("for update");
    expect(sql).toMatch(/revoke all on function public\.reserve_campaign_usage\([^;]+\) from public, anon/i);
    expect(sql).toMatch(/grant execute on function public\.reserve_campaign_usage\([^;]+\) to authenticated/i);
  });

  it("only lets the reservation actor finalize an active reservation", () => {
    const sql = read("20261009001100_workspace_usage_budgets.sql");
    expect(sql).toContain("reservation_actor_mismatch");
    expect(sql).toContain("v_reservation.actor_user_id <> v_user_id");
    expect(sql).toContain("v_reservation.status <> 'active'");
    expect(sql).toMatch(/revoke all on function public\.finalize_campaign_usage_reservation\([^;]+\) from public, anon/i);
    expect(sql).toMatch(/grant execute on function public\.finalize_campaign_usage_reservation\([^;]+\) to authenticated/i);
  });

  it("checks workspace membership before returning usage-budget totals", () => {
    const sql = read("20261009001100_workspace_usage_budgets.sql");
    const body = sql.slice(sql.indexOf("create or replace function public.get_workspace_usage_budget"), sql.indexOf("$$;", sql.indexOf("create or replace function public.get_workspace_usage_budget")) + 3);
    expect(body).toContain("auth.uid()");
    expect(body).toContain("workspace_forbidden");
    expect(body).toContain("where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id");
    expect(sql).toMatch(/grant execute on function public\.get_workspace_usage_budget\(uuid\) to authenticated/i);
  });

  it("scopes package selection and content review to a member's workspace", () => {
    const sql = read("20261009001400_secure_workflow_function_search_path.sql");
    expect(sql).toContain("where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id");
    expect(sql).toContain("where c.id = p_campaign_id and c.workspace_id = p_workspace_id");
    expect(sql).toContain("where cp.campaign_id = p_campaign_id and cp.workspace_id = p_workspace_id");
    expect(sql).toContain("where wm.workspace_id = v_draft.workspace_id and wm.user_id = v_user_id");
    expect(sql).toContain("Only workspace owners and admins can review content.");
    expect(sql).toMatch(/revoke all on function public\.select_campaign_package\([^;]+\) from public, anon/i);
    expect(sql).toMatch(/grant execute on function public\.select_campaign_package\([^;]+\) to authenticated/i);
    expect(sql).toMatch(/revoke all on function public\.review_content_draft\([^;]+\) from public, anon/i);
    expect(sql).toMatch(/grant execute on function public\.review_content_draft\([^;]+\) to authenticated/i);
  });

  it("uses an empty search_path for all six exposed security-definer functions in the current migration set", () => {
    const files = [
      "20261009000700_learning_audit_integrity.sql",
      "20261009001100_workspace_usage_budgets.sql",
      "20261009001400_secure_workflow_function_search_path.sql",
    ].map(read).join("\n");
    expect(files.match(/security definer\s+set search_path = ''/gi)?.length).toBeGreaterThanOrEqual(6);
  });
});
