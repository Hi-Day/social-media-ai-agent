import { afterEach, describe, expect, it, vi } from "vitest";
import { getImageProvider } from "../lib/media-provider";

afterEach(() => vi.unstubAllEnvs());

describe("image provider", () => {
  it("fails closed when not configured", async () => {
    vi.stubEnv("IMAGE_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "");
    await expect(getImageProvider().generateImage({prompt:"test",aspectRatio:"1:1",modelCodename:"Balance"}))
      .rejects.toThrow("IMAGE_PROVIDER_NOT_CONFIGURED");
  });
  it("rejects unsupported providers", () => {
    vi.stubEnv("IMAGE_PROVIDER", "unknown");
    expect(() => getImageProvider()).toThrow("IMAGE_PROVIDER_UNSUPPORTED:unknown");
  });
  it("extracts image URLs from provider responses", async () => {
    vi.stubEnv("IMAGE_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "test-image-model");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id:"resp-1", choices:[{message:{images:[{image_url:{url:"https://cdn.example/image.png"}}]}}],
    }), {status:200,headers:{"content-type":"application/json"}}));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getImageProvider().generateImage({prompt:"test",aspectRatio:"4:5",modelCodename:"Balance"});
    expect(result.url).toBe("https://cdn.example/image.png");
    expect(result.provider).toBe("openrouter");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("fails on provider HTTP errors", async () => {
    vi.stubEnv("IMAGE_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_IMAGE_MODEL", "test-image-model");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad gateway",{status:502})));
    await expect(getImageProvider().generateImage({prompt:"test",aspectRatio:"1:1",modelCodename:"Balance"}))
      .rejects.toThrow("IMAGE_PROVIDER_ERROR:502");
  });
});