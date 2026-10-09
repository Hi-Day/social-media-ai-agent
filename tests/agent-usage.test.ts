import { afterEach, describe, expect, it, vi } from "vitest";
import { generateCaptionWithUsage } from "../lib/agent";

describe("provider usage capture for text generation", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("records gateway-reported token counts and USD cost", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "A measured, evidence-led post." } }],
      usage: { prompt_tokens: 120, completion_tokens: 18, total_tokens: 138, cost: 0.00042 },
    }), { status: 200 }));

    const result = await generateCaptionWithUsage("Write a post");
    expect(result.caption).toBe("A measured, evidence-led post.");
    expect(result.usage).toEqual({
      promptTokens: 120,
      completionTokens: 18,
      totalTokens: 138,
      providerCostUsd: 0.00042,
      costSource: "provider_reported",
    });
  });

  it("does not invent a cost when the gateway omits cost fields", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "Draft." } }],
      usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
    }), { status: 200 }));

    const result = await generateCaptionWithUsage("Write a post");
    expect(result.usage.totalTokens).toBe(60);
    expect(result.usage.providerCostUsd).toBeNull();
    expect(result.usage.costSource).toBe("not_available");
  });

  it("marks fallback generation as demo rather than provider usage", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const result = await generateCaptionWithUsage("Write a post");
    expect(result.caption).toContain("Write a post");
    expect(result.usage.providerCostUsd).toBeNull();
    expect(result.usage.costSource).toBe("demo");
  });
});
