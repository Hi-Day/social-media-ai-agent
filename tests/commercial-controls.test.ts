import { describe, expect, it } from "vitest";
import { evaluateBudgetHealth } from "../lib/commercial-controls";

const base = { monthlyLimit: 100, usedCredits: 60, reservedCredits: 10, hardLimit: true, configured: true };

describe("commercial usage budget signals", () => {
  it("includes active reservations when computing remaining budget", () => {
    expect(evaluateBudgetHealth(base)).toEqual({ utilizationPercent: 70, remainingCredits: 30, warningLevel: "normal", executionMayBeBlocked: false });
  });
  it("warns at 75% and escalates at 90% and 100%", () => {
    expect(evaluateBudgetHealth({ ...base, usedCredits: 75, reservedCredits: 0 }).warningLevel).toBe("warning");
    expect(evaluateBudgetHealth({ ...base, usedCredits: 90, reservedCredits: 0 }).warningLevel).toBe("critical");
    expect(evaluateBudgetHealth({ ...base, usedCredits: 100, reservedCredits: 0 })).toMatchObject({ warningLevel: "exceeded", executionMayBeBlocked: true });
  });
  it("does not claim a configured budget when no limit exists", () => {
    expect(evaluateBudgetHealth({ ...base, monthlyLimit: null, configured: false }).warningLevel).toBe("unconfigured");
  });
  it("does not indicate a hard block for a soft budget", () => {
    expect(evaluateBudgetHealth({ ...base, usedCredits: 110, hardLimit: false }).executionMayBeBlocked).toBe(false);
  });
});
