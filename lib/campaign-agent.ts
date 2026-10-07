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

const TEXT_TYPES = new Set(["LinkedIn Post", "Social Post", "Caption", "Text Post"]);

export async function executeCampaignTask(
  task: CampaignContentTask,
  campaign: CampaignContext,
  brand: BrandContext,
) {
  const contentType = task.content_type || "Content";
  const platform = task.platform || "Multi-platform";

  // Every campaign asset gets an honest execution state. For visual formats,
  // the text layer can still be generated while the media provider remains pending.
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

  const mediaRequired = !TEXT_TYPES.has(contentType);
  if (!mediaRequired) {
    return {
      caption,
      mediaRequired: false,
      mediaStatus: "generated",
      mediaUrl: null,
      mediaMetadata: {},
    };
  }

  const image = await generateCampaignImage(task, campaign, brand);

  return {
    caption,
    mediaRequired: true,
    mediaStatus: "generated",
    mediaUrl: image.url,
    mediaMetadata: {
      provider: image.provider,
      model_codename: image.modelCodename,
      aspect_ratio: image.aspectRatio,
      ...(image.metadata ?? {}),
    },
  };
}
