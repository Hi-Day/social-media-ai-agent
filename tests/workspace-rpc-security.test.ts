import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("workspace bootstrap RPC security", () => {
  it("routes workspace creation through one atomic RPC rather than direct table inserts", () => {
    const route = read("app/api/workspace/route.ts");
    expect(route).toContain("supabase.rpc(");
    expect(route).toContain('"create_workspace_for_current_user"');
    expect(route).not.toMatch(/from\(["']workspaces["']\)\s*\.insert\(/);
    expect(route).not.toMatch(/from\(["']workspace_members["']\)\s*\.insert\(/);
  });

  it("uses an invoker wrapper while keeping elevated writes in the private auth-checked function", () => {
    const migration = read("supabase/migrations/20261013033223_workspace_creation_rpc_invoker_hardening.sql");
    const baseline = read("supabase/migrations/002_auth_rls.sql");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("select private.create_workspace(p_name, p_brand_name)");
    expect(migration).toMatch(/revoke all on function public\.create_workspace_for_current_user\(text, text\) from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.create_workspace_for_current_user\(text, text\) to authenticated/i);
    expect(migration).not.toMatch(/security definer/i);
    expect(baseline).toContain("create or replace function private.create_workspace");
    expect(baseline).toContain("v_user_id uuid := (select auth.uid())");
    expect(baseline).toContain("insert into public.workspace_members(workspace_id, user_id, role)");
  });
});
