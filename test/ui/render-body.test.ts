// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { CommentEntry } from "../../src/model/build-entry-list";
import { renderBody } from "../../src/ui/render-body";

const PID = "0123456789abcdef01234567";
const SORT = { key: "lastActivity", order: "desc" } as const;

function entry(threadId: string, lastActivityAt: number): CommentEntry {
  const message = (timestamp: number) => ({
    authorName: "Alice",
    content: threadId,
    timestamp,
  });
  return {
    threadId,
    docId: "d1",
    highlightedText: "",
    firstMessage: message(100),
    lastMessage: message(lastActivityAt),
    replyCount: 0,
  };
}

function container(nodes: Node[]): HTMLElement {
  const div = document.createElement("div");
  div.append(...nodes);
  return div;
}

describe("renderBody", () => {
  it("shows a busy message while loading", () => {
    const body = container(renderBody({ kind: "loading" }, SORT, PID));
    const loading = body.querySelector("[aria-busy='true']");
    expect(loading?.textContent).toBe("Loading comments…");
  });

  it("shows the error message in an alert with a link to report it", () => {
    const body = container(
      renderBody(
        { kind: "error", message: "GET /project/p/threads failed: HTTP 403" },
        SORT,
        PID,
      ),
    );
    const alert = body.querySelector("[role='alert']");
    expect(alert?.querySelector(".error-message")?.textContent).toBe(
      "GET /project/p/threads failed: HTTP 403",
    );
    expect(alert?.querySelector("a")?.getAttribute("href")).toBe(
      "https://github.com/mei28/overleaf-comment-filter/issues",
    );
  });

  it("says so when there are no unresolved comments", () => {
    const body = container(
      renderBody(
        { kind: "loaded", list: { entries: [], unanchoredThreadCount: 0 } },
        SORT,
        PID,
      ),
    );
    expect(body.textContent).toBe("No unresolved comments in any file.");
  });

  it("lists entries in the selected order", () => {
    const list = {
      entries: [entry("older", 200), entry("newer", 300)],
      unanchoredThreadCount: 0,
    };
    const body = container(renderBody({ kind: "loaded", list }, SORT, PID));
    const contents = [...body.querySelectorAll("ol > li .entry-content")].map(
      (node) => node.textContent,
    );
    expect(contents).toEqual(["newer", "older"]);
  });

  it.each([
    [0, []],
    [1, ["1 unresolved thread has no position in any file and is not listed."]],
    [
      2,
      ["2 unresolved threads have no position in any file and are not listed."],
    ],
  ])("notes %i threads without a position", (count, expected) => {
    const list = { entries: [entry("a", 200)], unanchoredThreadCount: count };
    const body = container(renderBody({ kind: "loaded", list }, SORT, PID));
    expect(
      [...body.querySelectorAll(".unanchored-note")].map((n) => n.textContent),
    ).toEqual(expected);
  });
});
