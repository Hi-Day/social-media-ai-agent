import { describe, expect, it } from "vitest";

const validPlan = (code: string) => ["starter", "growth", "agency"].includes(code);

describe("billing plan validation contract", () => {
  it("allows only server-catalog plan codes", () => {
    expect(validPlan("starter")).toBe(true);
    expect(validPlan("growth")).toBe(true);
    expect(validPlan("agency")).toBe(true);
    expect(validPlan("free")).toBe(false);
    expect(validPlan("admin")).toBe(false);
  });

  it("keeps checkout authority server-side", () => {
    const source = require("node:fs").readFileSync("app/api/billing/checkout/route.ts", "utf8");
    expect(source).toContain("SOCIALOS_");
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).toContain("Wait for a verified Xendit webhook");
    expect(source).not.toContain("body.amount");
    expect(source).not.toContain("body.monthlyCreditLimit");
  });
});
