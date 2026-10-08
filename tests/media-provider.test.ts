import { afterEach, describe, expect, it, vi } from "vitest";
import { getImageProvider } from "../lib/media-provider";

describe("image provider", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("fails closed when image provider credentials are missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_IMAGE_MODEL;

    await expect(
      getImageProvider().generateImage({
        prompt: "test",
        aspectRatio: "1:1",
        modelCodename: "Studio",
      }),
    ).rejects.toThrow("IMAGE_PROVIDER_NOT_CONFIGURED");
  });

  it("rejects unsupported providers", () => {
    process.env.IMAGE_PROVIDER = "unknown";
    expect(() => getImageProvider()).toThrow("IMAGE_PROVIDER_UNSUPPORTED:unknown");
  });

  it("extracts an image URL from an OpenRouter image response", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_IMAGE_MODEL = "test-image-model";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        id: "resp_123",
        choices: [{
          message: {
            images: [{ image_url: { url: "https://cdn.example/image.png" } }],
          },
        }],
      }), { status: 200 }),
    );

    const result = await getImageProvider().generateImage({
      prompt: "test",
      aspectRatio: "4:5",
      modelCodename: "Studio",
    });

    expect(result).toMatchObject({
      url: "https://cdn.example/image.png",
      provider: "openrouter",
      modelCodename: "Studio",
      metadata: { response_id: "resp_123" },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails explicitly on provider HTTP errors", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_IMAGE_MODEL = "test-image-model";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    await expect(
      getImageProvider().generateImage({
        prompt: "test",
        aspectRatio: "9:16",
        modelCodename: "Pro",
      }),
    ).rejects.toThrow("IMAGE_PROVIDER_ERROR:429");
  });
});

// Keep provider tests deterministic: no real image API calls are made in CI.
