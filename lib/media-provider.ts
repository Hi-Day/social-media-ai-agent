export type ImageGenerationRequest = {
  prompt: string;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  modelCodename: string;
};

export type GeneratedMedia = {
  url: string;
  provider: string;
  modelCodename: string;
  metadata?: Record<string, unknown>;
};

export interface ImageProvider {
  generateImage(request: ImageGenerationRequest): Promise<GeneratedMedia>;
}

class OpenRouterImageProvider implements ImageProvider {
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedMedia> {
    const key = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_IMAGE_MODEL;
    if (!key || !model) {
      throw new Error("IMAGE_PROVIDER_NOT_CONFIGURED");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "SocialOS",
      },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`IMAGE_PROVIDER_ERROR:${response.status}`);
    }

    const data = await response.json();
    const url =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      data?.choices?.[0]?.message?.content?.match(/https?:\/\/[^\s)]+/)?.[0];

    if (!url) throw new Error("IMAGE_PROVIDER_NO_ASSET");
    const usage = data?.usage ?? {};
    const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
    const providerCostUsd = numeric(usage.cost);
    return {
      url,
      provider: "openrouter",
      modelCodename: request.modelCodename,
      metadata: {
        response_id: data.id,
        usage: {
          promptTokens: numeric(usage.prompt_tokens),
          completionTokens: numeric(usage.completion_tokens),
          totalTokens: numeric(usage.total_tokens),
          providerCostUsd,
          costSource: providerCostUsd !== null ? "provider_reported" : "not_available",
        },
      },
    };
  }
}

export function getImageProvider(): ImageProvider {
  const provider = process.env.IMAGE_PROVIDER || "openrouter";
  if (provider === "openrouter") return new OpenRouterImageProvider();
  throw new Error(`IMAGE_PROVIDER_UNSUPPORTED:${provider}`);
}
