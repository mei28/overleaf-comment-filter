// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiThread, ApiThreads } from "../../src/api/decode-threads";
import { createCurrentFileSorting } from "../../src/current-file/current-file-sorting";
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

// The Current file tab as Overleaf renders it: entries absolutely
// positioned next to their lines.
function mountCurrentFile(ids: string[]): HTMLElement {
  const root = document.createElement("div");
  root.id = "review-panel-current-file";
  root.innerHTML = `<div>${ids
    .map(
      (id, i) =>
        `<div class="review-panel-entry review-panel-entry-comment" data-id="${id}" style="position: absolute; top: ${i * 100}px"></div>`,
    )
    .join("")}</div>`;
  document.body.append(root);
  return root;
}

function setup(
  options: {
    renderAll?: () => Promise<void>;
    loadThreads?: () => Promise<ApiThreads>;
  } = {},
) {
  let openDoc: string | Error = "d1";
  let height = 700;
  const loadThreads = vi.fn(options.loadThreads ?? (async () => THREADS));
  const renderAll = vi.fn(options.renderAll ?? (async () => {}));
  const statuses: SorterStatus[] = [];
  const sorting = createCurrentFileSorting({
    doc: document,
    times: createThreadTimesSource(loadThreads),
    readThreadId: (entry) => entry.getAttribute("data-id") as string,
    renderAll,
    openDocId: () => {
      if (openDoc instanceof Error) throw openDoc;
      return openDoc;
    },
    listHeight: () => height,
    reloadDelayMs: 50,
    onStatus: (status) => statuses.push(status),
  });
  const setHeight = (value: number) => {
    height = value;
  };
  const switchDoc = (docId: string | Error) => {
    openDoc = docId;
  };
  return { sorting, loadThreads, renderAll, statuses, switchDoc, setHeight };
}

function entryHtml(id: string): string {
  return `<div class="review-panel-entry review-panel-entry-comment" data-id="${id}"></div>`;
}

function visualOrder(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".review-panel-entry")]
    .map((el, index) => ({ el: el as HTMLElement, index }))
    .toSorted(
      (x, y) =>
        Number(x.el.style.order || 0) - Number(y.el.style.order || 0) ||
        x.index - y.index,
    )
    .map(({ el }) => el.getAttribute("data-id") as string);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createCurrentFileSorting", () => {
  it("leaves the tab alone for document order", () => {
    const root = mountCurrentFile(["b", "a"]);
    const { sorting, renderAll, loadThreads } = setup();

    sorting.sync();
    sorting.setPreset("document");

    expect(root.dataset.ocfMode).toBeUndefined();
    expect(renderAll).not.toHaveBeenCalled();
    expect(loadThreads).not.toHaveBeenCalled();
  });

  it("renders every comment, then lists them by the preset", async () => {
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting, renderAll, statuses } = setup();
    sorting.sync();

    sorting.setPreset("latestReply");

    await vi.waitFor(() => expect(visualOrder(root)).toEqual(["c", "a", "b"]));
    expect(renderAll).toHaveBeenCalledTimes(1);
    expect(root.getAttribute("data-ocf-mode")).toBe("time");
    expect(
      (root as HTMLElement).style.getPropertyValue("--ocf-list-height"),
    ).toBe("700px");
    expect(statuses).toContainEqual({ kind: "loading" });
    expect(statuses.at(-1)).toEqual({ kind: "idle" });
  });

  it("restores Overleaf's layout for document order", async () => {
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting } = setup();
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(root.dataset.ocfMode).toBe("time"));

    sorting.setPreset("document");

    expect(root.dataset.ocfMode).toBeUndefined();
    expect(root.style.getPropertyValue("--ocf-list-height")).toBe("");
    expect(root.querySelectorAll("[style*='order']")).toHaveLength(0);
  });

  it("renders all comments again after another file is opened", async () => {
    mountCurrentFile(["a", "b", "c"]);
    const { sorting, renderAll, switchDoc } = setup();
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(renderAll).toHaveBeenCalledTimes(1));

    // Overleaf swaps the tab's entries for the other file's.
    switchDoc("d2");
    document.body.replaceChildren();
    const root = mountCurrentFile(["c", "b"]);
    sorting.sync();

    await vi.waitFor(() => expect(visualOrder(root)).toEqual(["c", "b"]));
    expect(renderAll).toHaveBeenCalledTimes(2);
  });

  it("reports a failure and keeps Overleaf's layout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting, statuses } = setup({
      renderAll: async () => {
        throw new Error("Overleaf editor: editor.view.scrollDOM not found");
      },
    });
    sorting.sync();

    sorting.setPreset("latestReply");

    await vi.waitFor(() =>
      expect(statuses.at(-1)).toEqual({
        kind: "error",
        message: "Overleaf editor: editor.view.scrollDOM not found",
      }),
    );
    expect(root.dataset.ocfMode).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "[overleaf-comment-filter]",
      expect.any(Error),
    );
  });

  it("re-sorts when Overleaf adds a comment or a reply", async () => {
    const root = mountCurrentFile(["a", "b", "c"]);
    const withNew: ApiThreads = new Map([...THREADS, ["d", thread(50, 500)]]);
    const replied: ApiThreads = new Map([...withNew, ["b", thread(200, 900)]]);
    const loads = [THREADS, withNew, replied];
    const { sorting, loadThreads } = setup({
      loadThreads: async () => loads.shift() as ApiThreads,
    });
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(visualOrder(root)).toEqual(["c", "a", "b"]));

    root.firstElementChild?.insertAdjacentHTML("beforeend", entryHtml("d"));
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual(["d", "c", "a", "b"]),
    );

    root.querySelector("[data-id='b']")?.append(document.createElement("div"));
    await vi.waitFor(() =>
      expect(visualOrder(root)).toEqual(["b", "d", "c", "a"]),
    );
    expect(loadThreads).toHaveBeenCalledTimes(3);
  });

  it("stays in Overleaf's layout when document order is chosen mid-render", async () => {
    let finishRender: () => void = () => {};
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting, statuses } = setup({
      renderAll: () =>
        new Promise<void>((resolve) => {
          finishRender = resolve;
        }),
    });
    sorting.sync();
    sorting.setPreset("latestReply");

    sorting.setPreset("document");
    finishRender();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(root.dataset.ocfMode).toBeUndefined();
    expect(visualOrder(root)).toEqual(["a", "b", "c"]);
    expect(statuses.at(-1)).toEqual({ kind: "idle" });
  });

  it("reports when the open file can no longer be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting, statuses, switchDoc } = setup();
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(root.dataset.ocfMode).toBe("time"));

    switchDoc(new Error("Overleaf editor: editor.open_doc_id not found"));
    sorting.sync();
    sorting.sync();

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toEqual({
      kind: "error",
      message: "Overleaf editor: editor.open_doc_id not found",
    });
    expect(root.dataset.ocfMode).toBeUndefined();
  });

  it("does not retry a failed order on later page changes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting, renderAll } = setup({
      renderAll: async () => {
        throw new Error("Overleaf editor: editor.view.scrollDOM not found");
      },
    });
    sorting.sync();
    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledTimes(1));

    root.firstElementChild?.insertAdjacentHTML("beforeend", entryHtml("d"));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(renderAll).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("fits the list to the panel again after a resize", async () => {
    const root = mountCurrentFile(["a", "b", "c"]);
    const { sorting, setHeight } = setup();
    sorting.sync();
    sorting.resize();
    expect(root.style.getPropertyValue("--ocf-list-height")).toBe("");

    sorting.setPreset("latestReply");
    await vi.waitFor(() => expect(root.dataset.ocfMode).toBe("time"));
    setHeight(1138);
    sorting.resize();

    expect(root.style.getPropertyValue("--ocf-list-height")).toBe("1138px");
  });
});
