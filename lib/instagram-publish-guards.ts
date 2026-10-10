export function isSocialTokenExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  return !Number.isFinite(expiry) || expiry <= now;
}

export function isPublishableInstagramImageDraft(draft: {
  caption?: string | null;
  platform?: string | null;
  media_url?: string | null;
  media_status?: string | null;
}): boolean {
  const platform = (draft.platform ?? "").toLowerCase();
  return Boolean(
    draft.caption?.trim() &&
    (platform === "instagram" || platform.includes("instagram") || platform === "multi-platform") &&
    draft.media_status === "generated" &&
    isPublicHttpsMediaUrl(draft.media_url),
  );
}

export function isPublicHttpsMediaUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local")
    ) return false;
    return true;
  } catch {
    return false;
  }
}
