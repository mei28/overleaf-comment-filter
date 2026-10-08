// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiThread, ApiThreads } from "../../src/api/decode-threads";
import { createOverviewSorting } from "../../src/overview/overview-sorting";
import type { SorterStatus } from "../../src/sorting/sorter-status";
import { createThreadTimesSource } from "../../src/sorting/thread-times-source";

function thread(createdAt: number, lastActivityAt: number): ApiThread {
  const message = (timestamp: number) => ({
    content: "",
    timestamp,
    user: undefined,
  });
  return {
    messages: [message(createdAt), message(lastActivityAt)],
    resolved: false,
  };
}

// Created order: a, b, c. Last activity order: b, a, c.
const THREADS: ApiThreads = new Map([
  ["a", thread(100, 300)],
  ["b", thread(200, 250)],
  ["c", thread(300, 400)],
]);

function entryHtml(id: string): string {
  return `<div class="review-panel-entry review-panel-entry-comment" data-id="${id}"></div>`;
}

// Mounts an Overview tab like Overleaf's: a root with one entries container
// per file.
function mountOverview(groups: string[][]): HTMLElement {
  const root = document.createElement("div");
  root.id = "review-panel-overview";
  root.innerHTML = `<div>${groups
    .map(
      (ids) =>
        `<div class="review-panel-overview-file-entries">${ids.map(entryHtml).join("")}</div>`,
    )
    .join("")}</div>`;
  document.body.append(root);
  return root;
}

const readDataId = (entry: Element) => entry.getAttribute("data-id") as string;

function setup(
  load: () => Promise<ApiThreads> = async () => THREADS,
  readThreadId: (entry: Element) => string = readDataId,
) {
  const loadThreads = vi.fn(load);
  const statuses: SorterStatus[] = [];
  const sorting = createOverviewSorting({
    doc: document,
    times: createThreadTimesSource(loadThreads),
    readThreadId,
    reloadDelayMs: 50,
    onStatus: (status) => statuses.push(status),
  });
  return { sorting, loadThreads, statuses };
}

// Entry ids of each file in visual order (by CSS order, then DOM order).
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

afterEach(() => {
  document.body.replaceChildren();
});

describe("createOverviewSorting", () => {
  it("leaves Overleaf's order alone for document order", () => {
    const root = mountOverview([["b", "a"]]);
    const { sorting, loadThreads } = setup();

    sorting.sync();
    sorting.setPreset("document");

    expect(visualOrder(root)).toEqual([["b", "a"]]);
    expect(loadThreads).not.toHaveBeenCalled();
  });

  it("loads thread times once and orders each file by the preset", async () => {
    const root = mountOverview([["a", "b", "c"]]);
    const { sorting, loadThreads } = setup();
    sorting.sync();

    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["c", "a", "b"]]),
    );

    sorting.setPreset("oldestComment");
    expect(visualOrder(root)).toEqual([["a", "b", "c"]]);
    expect(loadThreads).toHaveBeenCalledTimes(1);
  });

  it("returns to Overleaf's order for document order", async () => {
    const root = mountOverview([["a", "b", "c"]]);
    const { sorting } = setup();
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["c", "a", "b"]]),
    );

    sorting.setPreset("document");

    expect(visualOrder(root)).toEqual([["a", "b", "c"]]);
    expect(
      root.querySelectorAll(".review-panel-entry[style*='order']"),
    ).toHaveLength(0);
  });

  it("re-applies the order when Overleaf re-creates the entries", async () => {
    const root = mountOverview([["a", "b", "c"]]);
    const { sorting, loadThreads } = setup();
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["c", "a", "b"]]),
    );

    // Collapsing and expanding a file renders brand-new entry elements.
    const group = root.querySelector(".review-panel-overview-file-entries");
    group?.replaceChildren();
    group?.insertAdjacentHTML(
      "beforeend",
      ["a", "b", "c"].map(entryHtml).join(""),
    );

    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["c", "a", "b"]]),
    );
    expect(loadThreads).toHaveBeenCalledTimes(1);
  });

  it("refetches when a thread it does not know appears", async () => {
    const root = mountOverview([["a", "b", "c"]]);
    const withNew: ApiThreads = new Map([...THREADS, ["d", thread(50, 500)]]);
    const { sorting, loadThreads } = setup();
    loadThreads.mockResolvedValueOnce(THREADS).mockResolvedValue(withNew);
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["c", "a", "b"]]),
    );

    root
      .querySelector(".review-panel-overview-file-entries")
      ?.insertAdjacentHTML("beforeend", entryHtml("d"));

    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["d", "c", "a", "b"]]),
    );
    expect(loadThreads).toHaveBeenCalledTimes(2);
  });

  it("refetches once, after a pause, when replies change inside entries", async () => {
    const root = mountOverview([["a", "b", "c"]]);
    const bReplied: ApiThreads = new Map([...THREADS, ["b", thread(200, 900)]]);
    const { sorting, loadThreads } = setup();
    loadThreads.mockResolvedValueOnce(THREADS).mockResolvedValue(bReplied);
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["c", "a", "b"]]),
    );

    // Overleaf renders a new reply inside the existing entry, twice in a row.
    const entryB = root.querySelector("[data-id='b']");
    entryB?.append(document.createElement("div"));
    entryB?.append(document.createElement("div"));

    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual([["b", "c", "a"]]),
    );
    expect(loadThreads).toHaveBeenCalledTimes(2);
  });

  it("reports a failed load and keeps Overleaf's order", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const root = mountOverview([["a", "b", "c"]]);
    const { sorting, statuses } = setup(async () => {
      throw new Error("GET /project/p/threads failed: HTTP 403");
    });
    sorting.sync();

    sorting.setPreset("latestReply");

    await vi.waitFor(() =>
      expect(statuses.at(-1)).toEqual({
        kind: "error",
        message: "GET /project/p/threads failed: HTTP 403",
      }),
    );
    expect(visualOrder(root)).toEqual([["a", "b", "c"]]);
    expect(console.error).toHaveBeenCalledWith(
      "[overleaf-comment-filter]",
      expect.any(Error),
    );
  });

  it("reports unreadable entries and recovers once they can be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let readable = false;
    const root = mountOverview([["a", "b", "c"]]);
    const { sorting, statuses } = setup(undefined, (entry) => {
      if (!readable) {
        throw new Error("Overview comment entry: React fiber not found");
      }
      return readDataId(entry);
    });
    sorting.sync();

    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(statuses.at(-1)).toEqual({
        kind: "error",
        message: "Overview comment entry: React fiber not found",
      }),
    );
    expect(visualOrder(root)).toEqual([["a", "b", "c"]]);

    readable = true;
    sorting.setPreset("newestComment");
    expect(visualOrder(root)).toEqual([["c", "b", "a"]]);
    expect(statuses.at(-1)).toEqual({ kind: "idle" });
  });

  it("orders a re-opened Overview tab without fetching again", async () => {
    const first = mountOverview([["a", "b", "c"]]);
    const { sorting, loadThreads } = setup();
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() =>
      expect(visualOrder(first)).toEqual([["c", "a", "b"]]),
    );

    first.remove();
    sorting.sync();
    const second = mountOverview([["a", "b", "c"]]);
    sorting.sync();

    expect(visualOrder(second)).toEqual([["c", "a", "b"]]);
    expect(loadThreads).toHaveBeenCalledTimes(1);
  });

  it("reports a failure once, not on every later page change", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const root = mountOverview([["a", "b", "c"]]);
    const { sorting } = setup(undefined, () => {
      throw new Error("Overview comment entry: React fiber not found");
    });
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledTimes(1));

    root
      .querySelector(".review-panel-overview-file-entries")
      ?.insertAdjacentHTML("beforeend", entryHtml("d"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
