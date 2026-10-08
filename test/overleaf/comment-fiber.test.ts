// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { readCommentThreadId } from "../../src/overleaf/comment-fiber";

type FakeFiber = { memoizedProps: unknown; return: FakeFiber | null };

// Builds the fiber chain React attaches to a host element: the element's own
// fiber first, then its ancestors' fibers through `return`.
function entryWithFibers(propsFromElementUp: unknown[]): HTMLElement {
  const el = document.createElement("div");
  let fiber: FakeFiber | null = null;
  for (const props of propsFromElementUp.toReversed()) {
    fiber = { memoizedProps: props, return: fiber };
  }
  Object.assign(el, { __reactFiber$abc123: fiber });
  return el;
}

describe("readCommentThreadId", () => {
  it("reads the thread id from the nearest comment props", () => {
    const entry = entryWithFibers([
      { className: "review-panel-entry" },
      { position: 42 },
      {
        comment: { id: "c1", op: { c: "x", p: 42, t: "thread-1" } },
        docId: "d1",
      },
    ]);
    expect(readCommentThreadId(entry)).toBe("thread-1");
  });
});

describe("readCommentThreadId errors", () => {
  it("fails when React has not attached a fiber to the element", () => {
    expect(() =>
      readCommentThreadId(document.createElement("div")),
    ).toThrowError(
      "Overview comment entry: React fiber not found (__reactFiber$*)",
    );
  });

  it("fails when no nearby fiber carries comment props", () => {
    const entry = entryWithFibers([
      { className: "review-panel-entry" },
      { position: 42 },
      { docs: [] },
      { a: 1 },
      { b: 2 },
      { comment: { op: { t: "too-far" } } },
    ]);
    expect(() => readCommentThreadId(entry)).toThrowError(
      "Overview comment entry: no comment props within 5 React levels",
    );
  });
});
