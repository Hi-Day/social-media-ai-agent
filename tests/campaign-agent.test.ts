import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCaptionWithUsage } from "../lib/agent";
import { generateCampaignImage } from "../lib/image-agent";
import { executeCampaignTask } from "../lib/campaign-agent";

vi.mock("../lib/agent", () => ({ generateCaptionWithUsage: vi.fn() }));
vi.mock("../lib/image-agent", () => ({ generateCampaignImage: vi.fn() }));

const usage = {
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  providerCostUsd: 0.002,
  costSource: "provider_reported" as const,
};
const task = (content_type: string) => ({
  id: "task-1",
  title: "Launch announcement",
  platform: "LinkedIn",
  content_type,
  model_codename: "Fast",
  estimated_credits: 2,
});
const campaign = { name: "Launch", objective: "Awareness", audience: "Professionals" };
const brand = { name: "Example", voice: "Clear and helpful" };

describe("campaign task execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateCaptionWithUsage).mockResolvedValue({ caption: "Draft copy", usage });
  });

  it("returns text-only tasks without pretending media was generated", async () => {
    const result = await executeCampaignTask(task("LinkedIn Post"), campaign, brand);
    expect(result).toMatchObject({ caption: "Draft copy", mediaRequired: false, mediaStatus: "not_required", mediaUrl: null, usage });
    expect(generateCampaignImage).not.toHaveBeenCalled();
  });

  it("marks video as unavailable rather than reporting a false success", async () => {
    const result = await executeCampaignTask(task("Reel"), campaign, brand);
    expect(result).toMatchObject({
      mediaRequired: true,
      mediaStatus: "provider_unavailable",
      mediaUrl: null,
      mediaMetadata: { reason: "video_provider_not_implemented" },
    });
    expect(generateCampaignImage).not.toHaveBeenCalled();
  });

  it("returns a clear unavailable state for unsupported media formats", async () => {
    const result = await executeCampaignTask(task("Interactive AR Filter"), campaign, brand);
    expect(result).toMatchObject({
      mediaRequired: true,
      mediaStatus: "provider_unavailable",
      mediaMetadata: { reason: "unsupported_media_type", content_type: "Interactive AR Filter" },
    });
  });

  it("combines text and image costs without inventing missing cost", async () => {
    vi.mocked(generateCampaignImage).mockResolvedValue({
      url: "https://example.test/image.png",
      provider: "mock",
      modelCodename: "Balance",
      aspectRatio: "1:1",
      metadata: { usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, providerCostUsd: null, costSource: "not_available" } },
    } as Awaited<ReturnType<typeof generateCampaignImage>>);

    const result = await executeCampaignTask(task("Image"), campaign, brand);
    expect(result).toMatchObject({
      mediaRequired: true,
      mediaStatus: "generated",
      mediaUrl: "https://example.test/image.png",
      usage: {
        promptTokens: 120,
        completionTokens: 60,
        totalTokens: 180,
        providerCostUsd: 0.002,
        costSource: "partial",
      },
    });
  });
});
