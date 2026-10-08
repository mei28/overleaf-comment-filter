import { describe, expect, it } from "vitest";
import type { ApiDocRanges } from "../../src/api/decode-ranges";
import type {
  ApiMessage,
  ApiThread,
  ApiUser,
} from "../../src/api/decode-threads";
import { buildEntryList } from "../../src/model/build-entry-list";

const ALICE: ApiUser = { firstName: "Alice", lastName: "Example" };
const BOB: ApiUser = { firstName: "Bob" };

function message(content: string, timestamp: number, user = ALICE): ApiMessage {
  return { content, timestamp, user };
}

function thread(messages: ApiMessage[], resolved = false): ApiThread {
  return { messages, resolved };
}

function doc(
  docId: string,
  comments: Array<[threadId: string, highlightedText: string]>,
): ApiDocRanges {
  return {
    docId,
    comments: comments.map(([threadId, highlightedText]) => ({
      threadId,
      highlightedText,
    })),
  };
}

describe("buildEntryList", () => {
  it("joins a comment range with its unresolved thread", () => {
    const threads = new Map([
      [
        "t1",
        thread([
          message("Cite this?", 100),
          message("Done.", 200, BOB),
          message("Thanks!", 300),
        ]),
      ],
    ]);
    expect(
      buildEntryList(threads, [doc("d1", [["t1", "prior work"]])]),
    ).toEqual({
      entries: [
        {
          threadId: "t1",
          docId: "d1",
          highlightedText: "prior work",
          firstMessage: {
            authorName: "Alice Example",
            content: "Cite this?",
            timestamp: 100,
          },
          lastMessage: {
            authorName: "Alice Example",
            content: "Thanks!",
            timestamp: 300,
          },
          replyCount: 2,
        },
      ],
      unanchoredThreadCount: 0,
    });
  });

  it("skips resolved threads", () => {
    const threads = new Map([["t1", thread([message("Fixed.", 100)], true)]]);
    expect(buildEntryList(threads, [doc("d1", [["t1", "x"]])])).toEqual({
      entries: [],
      unanchoredThreadCount: 0,
    });
  });

  it("skips a range whose thread no longer exists", () => {
    expect(buildEntryList(new Map(), [doc("d1", [["gone", "x"]])])).toEqual({
      entries: [],
      unanchoredThreadCount: 0,
    });
  });

  it("counts unresolved threads that no range points to", () => {
    const threads = new Map([
      ["anchored", thread([message("a", 100)])],
      ["dangling", thread([message("b", 200)])],
      ["dangling-resolved", thread([message("c", 300)], true)],
    ]);
    const list = buildEntryList(threads, [doc("d1", [["anchored", "x"]])]);
    expect(list.entries.map((entry) => entry.threadId)).toEqual(["anchored"]);
    expect(list.unanchoredThreadCount).toBe(1);
  });

  it("lists a thread once per range that points to it, like Overleaf's overview", () => {
    const threads = new Map([["t1", thread([message("a", 100)])]]);
    const list = buildEntryList(threads, [
      doc("d1", [["t1", "first"]]),
      doc("d2", [["t1", "second"]]),
    ]);
    expect(
      list.entries.map((entry) => [entry.docId, entry.highlightedText]),
    ).toEqual([
      ["d1", "first"],
      ["d2", "second"],
    ]);
  });

  it("keeps an entry whose highlighted text was deleted", () => {
    const threads = new Map([["t1", thread([message("a", 100)])]]);
    const list = buildEntryList(threads, [doc("d1", [["t1", ""]])]);
    expect(list.entries.map((entry) => entry.highlightedText)).toEqual([""]);
  });
});
