export function isPastArchiveCutoff(
  publishedAt: string | null | undefined,
  createdAt: string | null | undefined,
  cutoffMs: number,
) {
  const postTime = Date.parse(publishedAt || createdAt || "");
  return Number.isFinite(postTime) && postTime < cutoffMs;
}
