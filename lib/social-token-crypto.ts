import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const encoded = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY_INVALID");
  return key;
}

export function encryptSocialToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSocialToken(envelope: string): string {
  const [version, ivText, tagText, ciphertextText, extra] = envelope.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText || extra !== undefined) throw new Error("SOCIAL_TOKEN_ENVELOPE_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}
