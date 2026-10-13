import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("workspace bootstrap RLS regression", () => {
  it("uses the atomic authenticated RPC instead of inserting workspace rows directly", () => {
    const route = read("app/api/workspace/route.ts");
    expect(route).toContain('supabase.rpc(\n    "create_workspace"');
    expect(route).not.toMatch(/from\(["']workspaces["']\)\s*\.insert\(/);
    expect(route).not.toMatch(/from\(["']workspace_members["']\)\s*\.insert\(/);
    expect(route).toContain("p_name: workspaceName");
    expect(route).toContain("p_brand_name: brandName");
  });

  it("exposes only a SECURITY INVOKER wrapper to authenticated users", () => {
    const migration = read("supabase/migrations/20261013000200_workspace_bootstrap_rpc.sql");
    expect(migration).toContain("create or replace function public.create_workspace");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("select private.create_workspace(p_name, p_brand_name)");
    expect(migration).toMatch(/revoke all on function public\.create_workspace\(text, text\) from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.create_workspace\(text, text\) to authenticated/i);
    expect(migration).not.toMatch(/security definer/i);
  });
});
