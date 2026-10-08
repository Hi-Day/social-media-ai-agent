import { getImageProvider } from "@/lib/media-provider";
import type { BrandContext } from "@/lib/agent";

type ImageTask = {
  title: string | null;
  platform: string | null;
  content_type: string | null;
  model_codename: string | null;
};

function aspectRatioFor(platform: string) {
  if (platform === "Instagram") return "4:5" as const;
  if (platform === "TikTok") return "9:16" as const;
  if (platform === "LinkedIn") return "1:1" as const;
  return "1:1" as const;
}

export async function generateCampaignImage(task: ImageTask, campaign: { name: string; objective: string }, brand: BrandContext) {
  const platform = task.platform || "Multi-platform";
  const contentType = task.content_type || "Visual";
  const brandContext = [
    brand.name && `Brand: ${brand.name}`,
    brand.voice && `Voice: ${brand.voice}`,
    brand.description && `Description: ${brand.description}`,
    brand.pillars && `Pillars: ${brand.pillars}`,
    brand.forbidden_topics && `Forbidden topics: ${brand.forbidden_topics}`,
  ].filter(Boolean).join("\n");

  const prompt = [
    "Create a polished social media visual.",
    `Campaign: ${campaign.name}`,
    `Objective: ${campaign.objective}`,
    `Platform: ${platform}`,
    `Format: ${contentType}`,
    brandContext,
    "Do not invent logos, product claims, statistics, people, partnerships, awards, or other factual brand elements.",
    "Prefer a clean composition with intentional negative space for copy.",
  ].filter(Boolean).join("\n");

  const generated = await getImageProvider().generateImage({
    prompt,
    aspectRatio: aspectRatioFor(platform),
    modelCodename: task.model_codename || "Balance",
  });

  return {
    ...generated,
    aspectRatio: aspectRatioFor(platform),
  };
}
