import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readMigration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8");

describe("content draft tenant-isolation hardening", () => {
  it("removes policies that allow campaign-less rows to bypass workspace membership", () => {
    const migration = readMigration("20261009001600_content_draft_rls_hardening.sql");
    expect(migration).toContain('drop policy if exists "members can create campaign draft metadata" on public.content_drafts');
    expect(migration).toContain('drop policy if exists "members can read campaign draft metadata" on public.content_drafts');
  });

  it("retains workspace-membership checks for draft reads and writes", () => {
    const baseline = readMigration("002_auth_rls.sql");
    expect(baseline).toContain('"members can read drafts"');
    expect(baseline).toContain('"members can create drafts"');
    expect(baseline).toContain("private.is_workspace_member(workspace_id)");
  });
});
