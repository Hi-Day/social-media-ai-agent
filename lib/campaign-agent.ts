import { generateCaptionWithUsage, type BrandContext, type ProviderUsage } from "@/lib/agent";
import { generateCampaignImage } from "@/lib/image-agent";

export type CampaignContentTask = {
  id: string;
  title: string | null;
  platform: string | null;
  content_type: string | null;
  model_codename: string | null;
  estimated_credits: number | null;
};

type CampaignContext = {
  name: string;
  objective: string;
  audience: string | null;
};

const TEXT_TYPES = new Set(["Post", "LinkedIn Post", "Social Post", "Caption", "Text Post"]);
const IMAGE_TYPES = new Set(["Carousel", "Image", "Story", "Static Post"]);
const VIDEO_TYPES = new Set(["Reel", "Hero Reel", "Short Video", "Video"]);

export async function executeCampaignTask(
  task: CampaignContentTask,
  campaign: CampaignContext,
  brand: BrandContext,
) {
  const contentType = task.content_type || "Content";
  const platform = task.platform || "Multi-platform";

  const textRequest = [
    `Campaign: ${campaign.name}`,
    `Objective: ${campaign.objective}`,
    campaign.audience ? `Audience: ${campaign.audience}` : "",
    `Platform: ${platform}`,
    `Content format: ${contentType}`,
    `Task: ${task.title || contentType}`,
    "Create the platform-appropriate copy for this campaign asset.",
    "Do not invent product facts, claims, statistics, customers, partnerships, awards, or achievements.",
  ].filter(Boolean).join("\n");

  const textResult = await generateCaptionWithUsage(textRequest, brand, {
    codename: task.model_codename || undefined,
    platform,
    contentType,
  });
  const caption = textResult.caption;

  if (TEXT_TYPES.has(contentType)) {
    return {
      caption,
      mediaRequired: false,
      mediaStatus: "not_required" as const,
      mediaUrl: null,
      mediaMetadata: {},
      usage: textResult.usage,
    };
  }

  if (VIDEO_TYPES.has(contentType)) {
    return {
      caption,
      mediaRequired: true,
      mediaStatus: "provider_unavailable" as const,
      mediaUrl: null,
      mediaMetadata: { reason: "video_provider_not_implemented" },
      usage: textResult.usage,
    };
  }

  if (!IMAGE_TYPES.has(contentType)) {
    return {
      caption,
      mediaRequired: true,
      mediaStatus: "provider_unavailable" as const,
      mediaUrl: null,
      mediaMetadata: { reason: "unsupported_media_type", content_type: contentType },
      usage: textResult.usage,
    };
  }

  const image = await generateCampaignImage(task, campaign, brand);

  const imageUsage = (image.metadata?.usage ?? {}) as Partial<ProviderUsage>;
  const textCost = textResult.usage.providerCostUsd;
  const imageCost = typeof imageUsage.providerCostUsd === "number" ? imageUsage.providerCostUsd : null;
  const costSources = [textResult.usage.costSource, imageUsage.costSource].filter((value): value is string => typeof value === "string");
  const hasMissingCost = costSources.some((value) => value !== "provider_reported");
  const knownCostCount = [textCost, imageCost].filter((value) => value !== null).length;
  const usage: ProviderUsage = {
    promptTokens: [textResult.usage.promptTokens, imageUsage.promptTokens].some((value) => typeof value === "number")
      ? (textResult.usage.promptTokens ?? 0) + (typeof imageUsage.promptTokens === "number" ? imageUsage.promptTokens : 0)
      : null,
    completionTokens: [textResult.usage.completionTokens, imageUsage.completionTokens].some((value) => typeof value === "number")
      ? (textResult.usage.completionTokens ?? 0) + (typeof imageUsage.completionTokens === "number" ? imageUsage.completionTokens : 0)
      : null,
    totalTokens: [textResult.usage.totalTokens, imageUsage.totalTokens].some((value) => typeof value === "number")
      ? (textResult.usage.totalTokens ?? 0) + (typeof imageUsage.totalTokens === "number" ? imageUsage.totalTokens : 0)
      : null,
    providerCostUsd: knownCostCount ? (textCost ?? 0) + (imageCost ?? 0) : null,
    costSource: knownCostCount && hasMissingCost ? "partial"
      : knownCostCount ? "provider_reported"
      : costSources.every((value) => value === "demo") ? "demo" : "not_available",
  };

  return {
    caption,
    mediaRequired: true,
    mediaStatus: "generated" as const,
    mediaUrl: image.url,
    mediaMetadata: {
      provider: image.provider,
      model_codename: image.modelCodename,
      aspect_ratio: image.aspectRatio,
      ...(image.metadata ?? {}),
    },
    usage,
  };
}
