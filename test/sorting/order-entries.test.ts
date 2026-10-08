// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { ThreadTimes } from "../../src/model/sort-by-time";
import {
  clearOverviewOrder,
  orderOverviewEntries,
} from "../../src/sorting/order-entries";

// Overview markup as Overleaf renders it: one flex container per file, with
// comment and tracked-change entries as direct children.
function overview(groups: string[][]): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = groups
    .map(
      (entries) =>
        `<div class="review-panel-overview-file-entries">${entries
          .map((id) =>
            id.startsWith("change")
              ? `<div class="review-panel-entry review-panel-entry-change" data-id="${id}"></div>`
              : `<div class="review-panel-entry review-panel-entry-comment" data-id="${id}"></div>`,
          )
          .join("")}</div>`,
    )
    .join("");
  return root;
}

const readThreadId = (entry: Element) =>
  entry.getAttribute("data-id") as string;

const TIMES: Record<string, ThreadTimes> = {
  a: { createdAt: 100, lastActivityAt: 400 },
  b: { createdAt: 200, lastActivityAt: 300 },
  c: { createdAt: 300, lastActivityAt: 500 },
};

// Entry ids of each group in visual order, i.e. sorted by CSS order.
function visualOrder(root: HTMLElement): string[][] {
  return [...root.querySelectorAll(".review-panel-overview-file-entries")].map(
    (group) =>
      [...group.children]
        .map((el, index) => ({ el: el as HTMLElement, index }))
        .toSorted(
          (x, y) =>
            Number(x.el.style.order || 0) - Number(y.el.style.order || 0) ||
            x.index - y.index,
        )
        .map(({ el }) => el.getAttribute("data-id") as string),
  );
}

describe("orderOverviewEntries", () => {
  it("orders the comments of each file by the chosen time", () => {
    const root = overview([
      ["a", "b"],
      ["b", "c", "a"],
    ]);
    orderOverviewEntries(
      root,
      { key: "lastActivity", order: "desc" },
      (id) => TIMES[id],
      readThreadId,
    );
    expect(visualOrder(root)).toEqual([
      ["a", "b"],
      ["c", "a", "b"],
    ]);
  });

  it("keeps tracked changes after the comments in their own order", () => {
    const root = overview([["change-1", "b", "change-2", "a"]]);
    orderOverviewEntries(
      root,
      { key: "lastActivity", order: "desc" },
      (id) => TIMES[id],
      readThreadId,
    );
    expect(visualOrder(root)).toEqual([["a", "b", "change-1", "change-2"]]);
  });

  it("reports threads it has no times for and puts them after known ones", () => {
    const root = overview([["new", "b", "a"]]);
    const result = orderOverviewEntries(
      root,
      { key: "lastActivity", order: "desc" },
      (id) => TIMES[id],
      readThreadId,
    );
    expect(visualOrder(root)).toEqual([["a", "b", "new"]]);
    expect(result).toEqual({ unknownThreadIds: ["new"] });
  });

  it("restores Overleaf's order when cleared", () => {
    const root = overview([["b", "change-1", "a"]]);
    orderOverviewEntries(
      root,
      { key: "lastActivity", order: "desc" },
      (id) => TIMES[id],
      readThreadId,
    );
    clearOverviewOrder(root);
    expect(visualOrder(root)).toEqual([["b", "change-1", "a"]]);
    expect(root.querySelectorAll("[style*='order']")).toHaveLength(0);
  });
});
