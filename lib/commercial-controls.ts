export type BudgetHealthInput = {
  monthlyLimit: number | null | undefined;
  usedCredits: number;
  reservedCredits: number;
  hardLimit: boolean;
  configured: boolean;
};

export type BudgetHealth = {
  utilizationPercent: number | null;
  remainingCredits: number | null;
  warningLevel: "unconfigured" | "normal" | "warning" | "critical" | "exceeded";
  executionMayBeBlocked: boolean;
};

/** Derive a transparent budget signal; this is informational and does not replace the DB reservation RPC. */
export function evaluateBudgetHealth(input: BudgetHealthInput): BudgetHealth {
  if (!input.configured || !Number.isFinite(input.monthlyLimit) || Number(input.monthlyLimit) <= 0) {
    return { utilizationPercent: null, remainingCredits: null, warningLevel: "unconfigured", executionMayBeBlocked: false };
  }
  const limit = Number(input.monthlyLimit);
  const consumedAndReserved = Math.max(0, input.usedCredits) + Math.max(0, input.reservedCredits);
  const utilizationPercent = Number((consumedAndReserved / limit * 100).toFixed(2));
  const remainingCredits = Number(Math.max(0, limit - consumedAndReserved).toFixed(4));
  const warningLevel = utilizationPercent >= 100 ? "exceeded" : utilizationPercent >= 90 ? "critical" : utilizationPercent >= 75 ? "warning" : "normal";
  return { utilizationPercent, remainingCredits, warningLevel, executionMayBeBlocked: input.hardLimit && utilizationPercent >= 100 };
}
