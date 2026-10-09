export type LinkedInDraftInput = { caption?: string | null; platform?: string | null };

/** Treat missing or malformed expiry timestamps as expired: fail closed before publishing. */
export function isSocialTokenExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt || typeof expiresAt !== "string") return true;
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry <= now;
}

export function isPublishableLinkedInDraft(draft: LinkedInDraftInput): boolean {
  return typeof draft.caption === "string"
    && draft.caption.trim().length > 0
    && typeof draft.platform === "string"
    && /(linkedin|multi-platform)/i.test(draft.platform);
}
