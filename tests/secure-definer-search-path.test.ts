import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("SECURITY DEFINER workflow function hardening", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261009001400_secure_workflow_function_search_path.sql"),
    "utf8",
  );

  it("uses an empty search_path for both exposed workflow functions", () => {
    expect(migration.match(/security definer\s+set search_path = ''/gi)).toHaveLength(2);
    expect(migration).toContain("public.select_campaign_package");
    expect(migration).toContain("public.review_content_draft");
  });

  it("schema-qualifies application tables while preserving intended grants", () => {
    expect(migration).toContain("from public.workspace_members");
    expect(migration).toContain("from public.content_drafts");
    expect(migration).toContain("from public.approvals");
    expect(migration).toContain("from public.content_packages");
    expect(migration).toContain("grant execute on function public.select_campaign_package(uuid, uuid, text, jsonb) to authenticated");
    expect(migration).toContain("grant execute on function public.review_content_draft(uuid, text) to authenticated");
  });
});
