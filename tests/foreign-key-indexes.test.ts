import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("foreign-key index coverage migration", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261009001500_foreign_key_indexes.sql"),
    "utf8",
  );

  it("adds covering indexes for the eight Supabase performance-advisor findings", () => {
    const expectedIndexes = [
      "idx_campaign_usage_events_actor_user",
      "idx_campaign_usage_events_campaign_id",
      "idx_campaign_usage_events_content_draft",
      "idx_campaign_usage_reservations_actor_user",
      "idx_campaign_usage_reservations_campaign_id",
      "idx_social_connections_connected_by",
      "idx_social_publications_initiated_by",
      "idx_workspace_usage_budgets_updated_by",
    ];
    for (const name of expectedIndexes) expect(migration).toContain(name);
    expect(migration.match(/create index if not exists/gi)).toHaveLength(8);
  });

  it("makes index creation repeatable and does not drop existing indexes", () => {
    expect(migration).toMatch(/create index if not exists/gi);
    expect(migration).not.toMatch(/drop index|drop table|delete from/i);
  });
});
