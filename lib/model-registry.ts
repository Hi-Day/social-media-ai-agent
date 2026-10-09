export type Capability = "text" | "image" | "video" | "voice" | "stt";
export type ModelCodename = "Swift" | "Balance" | "Pro" | "Studio" | "Cinematic";

export type ModelProfile = {
  codename: ModelCodename;
  capability: Capability;
  positioning: string;
  speed: 1 | 2 | 3 | 4 | 5;
  quality: 1 | 2 | 3 | 4 | 5;
  credits: number;
};

export const MODEL_PROFILES: ModelProfile[] = [
  { codename: "Swift", capability: "text", positioning: "Fast & economical", speed: 5, quality: 3, credits: 0.2 },
  { codename: "Balance", capability: "text", positioning: "Balanced quality and cost", speed: 4, quality: 4, credits: 0.5 },
  { codename: "Pro", capability: "text", positioning: "High quality", speed: 3, quality: 5, credits: 1.0 },
  { codename: "Swift", capability: "image", positioning: "Fast & economical", speed: 5, quality: 3, credits: 1.0 },
  { codename: "Balance", capability: "image", positioning: "Balanced quality and cost", speed: 4, quality: 4, credits: 2.0 },
  { codename: "Pro", capability: "image", positioning: "High quality", speed: 3, quality: 5, credits: 4.0 },
  { codename: "Studio", capability: "image", positioning: "Creative & premium", speed: 2, quality: 5, credits: 6.0 },
  { codename: "Swift", capability: "video", positioning: "Fast & economical", speed: 5, quality: 3, credits: 8.0 },
  { codename: "Balance", capability: "video", positioning: "Fast, strong quality", speed: 4, quality: 4, credits: 15.0 },
  { codename: "Pro", capability: "video", positioning: "High quality", speed: 3, quality: 5, credits: 25.0 },
  { codename: "Studio", capability: "video", positioning: "Creative & premium", speed: 2, quality: 5, credits: 40.0 },
  { codename: "Cinematic", capability: "video", positioning: "Premium visual storytelling", speed: 1, quality: 5, credits: 65.0 },
  { codename: "Swift", capability: "voice", positioning: "Fast & economical", speed: 5, quality: 3, credits: 1.0 },
  { codename: "Balance", capability: "voice", positioning: "Natural and balanced", speed: 4, quality: 4, credits: 2.0 },
  { codename: "Pro", capability: "voice", positioning: "Premium natural voice", speed: 3, quality: 5, credits: 4.0 },
  { codename: "Swift", capability: "stt", positioning: "Fast transcription", speed: 5, quality: 3, credits: 0.5 },
  { codename: "Balance", capability: "stt", positioning: "Accurate transcription", speed: 4, quality: 4, credits: 1.0 },
];

export function profilesFor(capability: Capability) {
  return MODEL_PROFILES.filter((profile) => profile.capability === capability);
}

export function getProfile(capability: Capability, codename: ModelCodename) {
  return MODEL_PROFILES.find((profile) => profile.capability === capability && profile.codename === codename);
}

export function chooseAutomaticModel(capability: Capability, importance: "supporting" | "core" | "hero", budget: "economy" | "balanced" | "premium"): ModelProfile {
  const profiles = profilesFor(capability);
  const targetQuality = importance === "hero" ? 5 : importance === "core" ? 4 : 3;
  const maxCost = budget === "economy" ? 1 : budget === "balanced" ? 4 : 999;
  return [...profiles].filter((profile) => profile.credits <= maxCost || profile === profiles[profiles.length - 1])
    .sort((a, b) => profileScore(b, targetQuality) - profileScore(a, targetQuality))[0] ?? profiles[0];
}

function profileScore(profile: ModelProfile, targetQuality: number) {
  return profile.quality * 3 - Math.abs(profile.quality - targetQuality) * 2 + profile.speed * 0.5 - profile.credits * 0.05;
}

export function estimateCredits(items: Array<{ capability: Capability; count: number; codename?: ModelCodename }>) {
  return items.reduce((sum, item) => {
    if (!Number.isFinite(item.count) || item.count < 0) {
      throw new Error("invalid_credit_estimate_count");
    }
    const profile = item.codename
      ? getProfile(item.capability, item.codename)
      : chooseAutomaticModel(item.capability, "core", "balanced");
    if (!profile) throw new Error("unsupported_model_profile");
    return sum + profile.credits * item.count;
  }, 0);
}
