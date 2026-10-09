export type BrandContext = {
  name?: string | null;
  voice?: string | null;
  description?: string | null;
  audience?: string | null;
  pillars?: string | null;
  do_rules?: string | null;
  cta_style?: string | null;
  forbidden_topics?: string | null;
  hashtag_strategy?: string | null;
  example_posts?: string | null;
  platform_guidance?: string | null;
};

export type GenerationOptions = {
  codename?: string;
  platform?: string;
  contentType?: string;
};

function resolveModel(codename?: string) {
  const key = codename?.toUpperCase();
  const configured = key ? process.env[`OPENROUTER_MODEL_${key}`] : undefined;
  return configured || process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1";
}

export type ProviderUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  providerCostUsd: number | null;
  costSource: "provider_reported" | "partial" | "not_available" | "demo";
};

export async function generateCaptionWithUsage(
  idea: string,
  brand: BrandContext = {},
  options: GenerationOptions = {},
): Promise<{ caption: string; usage: ProviderUsage }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      caption: demo(idea, brand),
      usage: { promptTokens: null, completionTokens: null, totalTokens: null, providerCostUsd: null, costSource: "demo" },
    };
  }

  const model = resolveModel(options.codename);
  const brandContext = [
    brand.name && "Brand: " + brand.name,
    brand.voice && "Voice: " + brand.voice,
    brand.description && "Brand description: " + brand.description,
    brand.audience && "Target audience: " + brand.audience,
    brand.pillars && "Content pillars: " + brand.pillars,
    brand.do_rules && "Do / don't rules: " + brand.do_rules,
    brand.cta_style && "CTA style: " + brand.cta_style,
    brand.forbidden_topics && "Forbidden topics: " + brand.forbidden_topics,
    brand.hashtag_strategy && "Hashtag strategy: " + brand.hashtag_strategy,
    brand.platform_guidance && "Platform guidance: " + brand.platform_guidance,
    brand.example_posts && "Reference examples (imitate principles, not facts):\\n" + brand.example_posts,
  ].filter(Boolean).join("\\n");

  const body = {
    model,
    messages: [
      {
        role: "system",
        content: "You are a senior social media strategist. Write concise, platform-appropriate social copy. Treat the supplied Brand Brain as binding style and safety guidance. Follow the content pillars, do/don't rules, CTA style, hashtag strategy, platform guidance, and forbidden topics when present. Reference examples are style guidance only; never copy their factual claims unless they are also present in the brand context or request. Never invent brand claims, facts, statistics, products, customers, partnerships, awards, or achievements. If the request conflicts with forbidden topics or the brand rules, choose a safe alternative. Return only the draft.",
      },
      {
        role: "user",
        content: brandContext
          ? "BRAND CONTEXT:\\n" + brandContext + "\\n\\nPLATFORM: " + (options.platform || "Multi-platform") + "\\nCONTENT FORMAT: " + (options.contentType || "Social content") + "\\nCONTENT REQUEST:\\n" + idea
          : "PLATFORM: " + (options.platform || "Multi-platform") + "\\nCONTENT FORMAT: " + (options.contentType || "Social content") + "\\nCONTENT REQUEST:\\n" + idea,
      },
    ],
    temperature: 0.7,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "SocialOS",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("LLM gateway error");
  const data = await response.json();
  const usage = data?.usage ?? {};
  const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  const promptTokens = numeric(usage.prompt_tokens);
  const completionTokens = numeric(usage.completion_tokens);
  const totalTokens = numeric(usage.total_tokens);
  const providerCostUsd = numeric(usage.cost);
  return {
    caption: data.choices?.[0]?.message?.content || demo(idea, brand),
    usage: {
      promptTokens,
      completionTokens,
      totalTokens,
      providerCostUsd,
      costSource: providerCostUsd !== null ? "provider_reported" : "not_available",
    },
  };
}

export async function generateCaption(
  idea: string,
  brand: BrandContext = {},
  options: GenerationOptions = {},
) {
  return (await generateCaptionWithUsage(idea, brand, options)).caption;
}

function demo(idea: string, brand: BrandContext) {
  const voiceHint = brand.voice ? " Keep the tone " + brand.voice + "." : "";
  const cta = brand.cta_style ? "\n\nCTA guidance: " + brand.cta_style : "";
  return "Here is a draft built around your idea" +
    (brand.name ? " for " + brand.name : "") +
    ": “" + idea + "”\n\nAI becomes most useful when it does more than generate content. The real opportunity is building systems that understand context, make recommendations, and keep humans in control of consequential decisions." +
    voiceHint + cta +
    "\n\n#AI #Marketing #SocialMedia";
}