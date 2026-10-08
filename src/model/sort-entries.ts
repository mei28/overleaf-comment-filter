import type { CommentEntry } from "./build-entry-list";

export type SortKey = "lastActivity" | "created";
export type SortOrder = "desc" | "asc";

const TIMESTAMP_OF: Record<SortKey, (entry: CommentEntry) => number> = {
  lastActivity: (entry) => entry.lastMessage.timestamp,
  created: (entry) => entry.firstMessage.timestamp,
};

// Returns a new array; the sort is stable, so equal timestamps keep their
// document order.
export function sortEntries(
  entries: CommentEntry[],
  key: SortKey,
  order: SortOrder,
): CommentEntry[] {
  const timestampOf = TIMESTAMP_OF[key];
  const direction = order === "asc" ? 1 : -1;
  return entries.toSorted(
    (a, b) => direction * (timestampOf(a) - timestampOf(b)),
  );
}
