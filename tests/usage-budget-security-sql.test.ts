import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readMigration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8");

describe("usage budget database security contract", () => {
  const migration = readMigration("20261009001100_workspace_usage_budgets.sql");

  it("does not expose reservation rows directly to API roles", () => {
    expect(migration).toContain("alter table public.campaign_usage_reservations enable row level security");
    expect(migration).toMatch(/revoke all on public\.campaign_usage_reservations from public, anon, authenticated/i);
    expect(migration).not.toMatch(/grant\s+select[^;]*campaign_usage_reservations\s+to\s+(anon|authenticated)/i);
  });

  it("requires authenticated identity and workspace admin role before reserving credits", () => {
    expect(migration).toContain("v_user_id uuid := (select auth.uid())");
    expect(migration).toContain("if v_role not in ('owner','admin') then raise exception 'campaign_execution_forbidden'");
    expect(migration).toContain("campaign_workspace_mismatch");
    expect(migration).toContain("grant execute on function public.reserve_campaign_usage(uuid,uuid,numeric) to authenticated");
  });

  it("restricts finalization to the user who owns the reservation", () => {
    expect(migration).toContain("reservation_actor_mismatch");
    expect(migration).toContain("v_reservation.actor_user_id <> v_user_id");
    expect(migration).toContain("grant execute on function public.finalize_campaign_usage_reservation(uuid,text) to authenticated");
  });

  it("checks workspace membership before exposing budget totals", () => {
    expect(migration).toContain("workspace_forbidden");
    expect(migration).toContain("where wm.workspace_id = p_workspace_id and wm.user_id = v_user_id");
  });
});
