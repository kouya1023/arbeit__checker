const reviewDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

export function formatReviewDate(createdAt: string | null): string {
  if (!createdAt) return "不明";

  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "不明" : reviewDateFormatter.format(date);
}
