import { describe, expect, it } from "vitest";
import { canExecuteCampaign } from "../lib/campaign-permissions";

describe("campaign execution permissions", () => {
  it("allows workspace owners and admins to execute campaigns", () => {
    expect(canExecuteCampaign("owner")).toBe(true);
    expect(canExecuteCampaign("admin")).toBe(true);
  });

  it("prevents ordinary members from triggering potentially billable generation", () => {
    expect(canExecuteCampaign("member")).toBe(false);
  });

  it("fails closed for missing or unknown roles", () => {
    expect(canExecuteCampaign(null)).toBe(false);
    expect(canExecuteCampaign(undefined)).toBe(false);
    expect(canExecuteCampaign("")).toBe(false);
    expect(canExecuteCampaign("superuser")).toBe(false);
  });
});
