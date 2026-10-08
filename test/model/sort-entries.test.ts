import { describe, expect, it } from "vitest";
import type { CommentEntry } from "../../src/model/build-entry-list";
import { sortEntries } from "../../src/model/sort-entries";

function entry(
  threadId: string,
  createdAt: number,
  lastActivityAt: number,
): CommentEntry {
  const message = (timestamp: number) => ({
    authorName: "Alice",
    content: "",
    timestamp,
  });
  return {
    threadId,
    docId: "d1",
    highlightedText: "",
    firstMessage: message(createdAt),
    lastMessage: message(lastActivityAt),
    replyCount: 0,
  };
}

// Created order is a, b, c; last activity order is b, c, a.
const ENTRIES = [
  entry("a", 100, 900),
  entry("b", 200, 300),
  entry("c", 300, 400),
];

const ids = (entries: CommentEntry[]) => entries.map((e) => e.threadId);

describe("sortEntries", () => {
  it("puts the most recent last activity first", () => {
    expect(ids(sortEntries(ENTRIES, "lastActivity", "desc"))).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("puts the oldest last activity first in ascending order", () => {
    expect(ids(sortEntries(ENTRIES, "lastActivity", "asc"))).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it.each([
    ["desc", ["c", "b", "a"]],
    ["asc", ["a", "b", "c"]],
  ] as const)("orders by thread creation time, %s", (order, expected) => {
    expect(ids(sortEntries(ENTRIES, "created", order))).toEqual(expected);
  });

  it("keeps the input order for equal timestamps", () => {
    const tied = [entry("x", 100, 500), entry("y", 200, 500)];
    expect(ids(sortEntries(tied, "lastActivity", "desc"))).toEqual(["x", "y"]);
  });

  it("does not reorder the input array", () => {
    const input = [...ENTRIES];
    sortEntries(input, "lastActivity", "desc");
    expect(ids(input)).toEqual(["a", "b", "c"]);
  });
});
