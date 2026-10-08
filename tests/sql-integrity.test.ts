import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = (name: string) => readFileSync(resolve(process.cwd(),"supabase/migrations",name),"utf8");

describe("workflow migration integrity", () => {
  it("hardens campaign selection transactionally", () => {
    const sql=migration("009_transactional_workflows.sql");
    expect(sql).toContain("create or replace function public.select_campaign_package");
    expect(sql).toContain("for update");
    expect(sql).toContain("insert into content_drafts");
    expect(sql).toContain("update campaigns");
  });
  it("hardens review state transitions transactionally", () => {
    const sql=migration("009_transactional_workflows.sql");
    expect(sql).toContain("create or replace function public.review_content_draft");
    expect(sql).toContain("Only workspace owners and admins can review content.");
    expect(sql).toContain("update approvals set status");
    expect(sql).toContain("update content_drafts set status");
  });
  it("protects model policy writes with admin RLS", () => {
    const sql=migration("010_workspace_model_policies.sql");
    expect(sql).toContain("alter table public.workspace_model_policies enable row level security");
    expect(sql).toContain("admins can insert model policies");
    expect(sql).toContain("admins can update model policies");
    expect(sql).toContain("admins can delete model policies");
  });
  it("tracks unavailable media honestly", () => {
    const sql=migration("011_media_assets.sql");
    expect(sql).toContain("provider_unavailable");
    expect(sql).toContain("media_url text");
    expect(sql).toContain("media_metadata jsonb");
  });
});