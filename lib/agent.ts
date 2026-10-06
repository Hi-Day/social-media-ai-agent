type BrandContext = {
  name?: string | null;
  voice?: string | null;
  description?: string | null;
  audience?: string | null;
};

export async function generateCaption(idea: string, brand: BrandContext = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return demo(idea, brand);

  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1";
  const brandContext = [
    brand.name && "Brand: " + brand.name,
    brand.voice && "Voice: " + brand.voice,
    brand.description && "Brand description: " + brand.description,
    brand.audience && "Target audience: " + brand.audience,
  ].filter(Boolean).join("\n");

  const body = {
    model,
    messages: [
      {
        role: "system",
        content: "You are a senior social media strategist. Write concise, platform-neutral social copy. Follow the supplied brand context when present. Never invent brand claims, facts, statistics, products, customers, or achievements. Return only the draft.",
      },
      {
        role: "user",
        content: brandContext
          ? "BRAND CONTEXT:\n" + brandContext + "\n\nCONTENT REQUEST:\n" + idea
          : idea,
      },
    ],
    temperature: 0.7,
  };

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "SocialOS",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) throw new Error("LLM gateway error");
  const d = await r.json();
  return d.choices?.[0]?.message?.content || demo(idea, brand);
}

function demo(idea: string, brand: BrandContext) {
  return "Here is a draft built around your idea" +
    (brand.name ? " for " + brand.name : "") +
    ": “" + idea + "”\n\nAI becomes most useful when it does more than generate content. The real opportunity is building systems that understand context, make recommendations, and keep humans in control of consequential decisions.\n\nWhat would you automate first in your social media workflow?\n\n#AI #Marketing #SocialMedia";
}