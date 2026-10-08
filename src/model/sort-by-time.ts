export type SortKey = "lastActivity" | "created";
export type SortOrder = "desc" | "asc";
export type SortSetting = { key: SortKey; order: SortOrder };

export type ThreadTimes = { createdAt: number; lastActivityAt: number };

const TIME_OF: Record<SortKey, (times: ThreadTimes) => number> = {
  lastActivity: (times) => times.lastActivityAt,
  created: (times) => times.createdAt,
};

// Returns a new array; the sort is stable, so equal times keep their input
// (document) order.
export function sortByTime<T>(
  items: readonly T[],
  timesOf: (item: T) => ThreadTimes,
  { key, order }: SortSetting,
): T[] {
  const timeOf = (item: T) => TIME_OF[key](timesOf(item));
  const direction = order === "asc" ? 1 : -1;
  return items.toSorted((a, b) => direction * (timeOf(a) - timeOf(b)));
}
