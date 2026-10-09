import { generateCaption, type BrandContext } from "@/lib/agent";
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

  const caption = await generateCaption(textRequest, brand, {
    codename: task.model_codename || undefined,
    platform,
    contentType,
  });

  if (TEXT_TYPES.has(contentType)) {
    return {
      caption,
      mediaRequired: false,
      mediaStatus: "not_required" as const,
      mediaUrl: null,
      mediaMetadata: {},
    };
  }

  if (VIDEO_TYPES.has(contentType)) {
    return {
      caption,
      mediaRequired: true,
      mediaStatus: "provider_unavailable" as const,
      mediaUrl: null,
      mediaMetadata: { reason: "video_provider_not_implemented" },
    };
  }

  if (!IMAGE_TYPES.has(contentType)) {
    return {
      caption,
      mediaRequired: true,
      mediaStatus: "provider_unavailable" as const,
      mediaUrl: null,
      mediaMetadata: { reason: "unsupported_media_type", content_type: contentType },
    };
  }

  const image = await generateCampaignImage(task, campaign, brand);

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
  };
}
