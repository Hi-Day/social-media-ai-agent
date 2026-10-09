import { afterEach, describe, expect, it } from "vitest";
import { decryptSocialToken, encryptSocialToken } from "../lib/social-token-crypto";

const originalKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
const validKey = Buffer.alloc(32, 7).toString("base64");
afterEach(() => {
  if (originalKey === undefined) delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = originalKey;
});

describe("social token encryption", () => {
  it("encrypts and decrypts tokens without storing plaintext", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = validKey;
    const token = "linkedin-access-token-secret";
    const encrypted = encryptSocialToken(token);
    expect(encrypted).not.toContain(token);
    expect(decryptSocialToken(encrypted)).toBe(token);
  });
  it("uses a fresh nonce for each encryption", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = validKey;
    expect(encryptSocialToken("same-token")).not.toBe(encryptSocialToken("same-token"));
  });
  it("rejects tampered ciphertext", () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = validKey;
    const parts = encryptSocialToken("secret").split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSocialToken(parts.join("."))).toThrow();
  });
  it("fails closed if the key is missing or malformed", () => {
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptSocialToken("secret")).toThrow("SOCIAL_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED");
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    expect(() => encryptSocialToken("secret")).toThrow("SOCIAL_TOKEN_ENCRYPTION_KEY_INVALID");
  });
});
