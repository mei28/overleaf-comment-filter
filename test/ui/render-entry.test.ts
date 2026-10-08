// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { CommentEntry } from "../../src/model/build-entry-list";
import { renderEntry } from "../../src/ui/render-entry";

const PID = "0123456789abcdef01234567";

function entry(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    threadId: "aaaaaaaaaaaaaaaaaaaa0001",
    docId: "dddddddddddddddddddd0001",
    highlightedText: "prior work",
    firstMessage: {
      authorName: "Alice Example",
      content: "Cite this?",
      timestamp: Date.UTC(2023, 10, 14, 22, 13),
    },
    lastMessage: {
      authorName: "Bob",
      content: "Done.",
      timestamp: Date.UTC(2023, 10, 15, 9, 5),
    },
    replyCount: 1,
    ...overrides,
  };
}

describe("renderEntry", () => {
  it("links the whole entry to the comment's deep link", () => {
    const link = renderEntry(entry(), PID).querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      `/project/${PID}?doc=dddddddddddddddddddd0001&comment=aaaaaaaaaaaaaaaaaaaa0001`,
    );
  });

  it("shows the highlighted text, the first message and who wrote it when", () => {
    const item = renderEntry(entry(), PID);
    expect(item.querySelector(".entry-quote")?.textContent).toBe("prior work");
    expect(item.querySelector(".entry-content")?.textContent).toBe(
      "Cite this?",
    );
    const created = item.querySelector(".entry-meta");
    expect(created?.textContent).toBe("Alice Example · 2023-11-14 22:13");
    expect(created?.querySelector("time")?.getAttribute("datetime")).toBe(
      "2023-11-14T22:13:00.000Z",
    );
  });

  it("omits the quote when the highlighted text was deleted", () => {
    const item = renderEntry(entry({ highlightedText: "" }), PID);
    expect(item.querySelector(".entry-quote")).toBeNull();
  });

  it.each([
    [1, "1 reply · last by Bob · 2023-11-15 09:05"],
    [3, "3 replies · last by Bob · 2023-11-15 09:05"],
  ])("summarises %i replies with the last activity", (replyCount, text) => {
    const activity = renderEntry(entry({ replyCount }), PID).querySelector(
      ".entry-activity",
    );
    expect(activity?.textContent).toBe(text);
    expect(activity?.querySelector("time")?.getAttribute("datetime")).toBe(
      "2023-11-15T09:05:00.000Z",
    );
  });

  it("omits the activity line for a thread without replies", () => {
    const item = renderEntry(entry({ replyCount: 0 }), PID);
    expect(item.querySelector(".entry-activity")).toBeNull();
  });

  it("renders comment text as text, never as HTML", () => {
    const payload = '<img src="x" onerror="alert(1)">';
    const item = renderEntry(
      entry({
        highlightedText: payload,
        firstMessage: { authorName: payload, content: payload, timestamp: 0 },
      }),
      PID,
    );
    expect(item.querySelector("img")).toBeNull();
    expect(item.querySelector(".entry-content")?.textContent).toBe(payload);
  });
});
