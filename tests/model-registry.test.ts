import { describe, expect, it } from "vitest";
import { MODEL_PROFILES, chooseAutomaticModel, estimateCredits, getProfile, profilesFor } from "../lib/model-registry";

describe("model registry", () => {
  it("keeps capability profiles internally consistent", () => {
    for (const capability of ["text","image","video","voice","stt"] as const) {
      const profiles = profilesFor(capability);
      expect(profiles.length).toBeGreaterThan(0);
      expect(new Set(profiles.map(p => p.codename)).size).toBe(profiles.length);
      for (const profile of profiles) expect(profile.capability).toBe(capability);
    }
  });
  it("selects models within the requested budget when possible", () => {
    expect(chooseAutomaticModel("text", "supporting", "economy").credits).toBeLessThanOrEqual(1);
    expect(chooseAutomaticModel("image", "core", "balanced").credits).toBeLessThanOrEqual(4);
    expect(chooseAutomaticModel("video", "hero", "premium").quality).toBe(5);
  });
  it("rejects impossible model lookups without silently changing capability", () => {
    expect(getProfile("text", "Studio")).toBeUndefined();
    expect(getProfile("image", "Studio")?.capability).toBe("image");
  });
  it("calculates credits from selected codenames", () => {
    expect(estimateCredits([
      { capability: "text", count: 2, codename: "Swift" },
      { capability: "image", count: 1, codename: "Studio" },
    ])).toBe(6.4);
  });

  it("fails closed rather than estimating unsupported models or invalid quantities as free", () => {
    expect(() => estimateCredits([
      { capability: "text", count: 1, codename: "Studio" as never },
    ])).toThrow("unsupported_model_profile");
    expect(() => estimateCredits([
      { capability: "text", count: -1, codename: "Swift" },
    ])).toThrow("invalid_credit_estimate_count");
    expect(() => estimateCredits([
      { capability: "text", count: Number.NaN, codename: "Swift" },
    ])).toThrow("invalid_credit_estimate_count");
  });

  it("has no duplicate capability/codename registry entries", () => {
    const keys = MODEL_PROFILES.map(p => `${p.capability}:${p.codename}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});