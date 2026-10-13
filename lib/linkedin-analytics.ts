export type LinkedInSocialActions = {
  likesSummary?: { totalLikes?: unknown; aggregatedTotalLikes?: unknown };
  commentsSummary?: { totalFirstLevelComments?: unknown; aggregatedTotalComments?: unknown };
};

export type NormalizedSocialMetrics = Partial<Record<"likes" | "comments", number>>;

function finiteNonNegative(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/** Missing summaries remain unavailable; an explicit zero remains a real observation. */
export function normalizeLinkedInSocialActions(payload: LinkedInSocialActions): NormalizedSocialMetrics {
  const result: NormalizedSocialMetrics = {};
  const likes = finiteNonNegative(payload.likesSummary?.totalLikes)
    ?? finiteNonNegative(payload.likesSummary?.aggregatedTotalLikes);
  const comments = finiteNonNegative(payload.commentsSummary?.totalFirstLevelComments)
    ?? finiteNonNegative(payload.commentsSummary?.aggregatedTotalComments);
  if (likes !== undefined) result.likes = likes;
  if (comments !== undefined) result.comments = comments;
  return result;
}

/** Use a daily UTC bucket as the idempotency key while fetched_at preserves exact freshness. */
export function analyticsDayBucket(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}
