// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { startApp } from "../../src/app/controller";
import type { CommentEntry, EntryList } from "../../src/model/build-entry-list";

const PID = "0123456789abcdef01234567";

function entry(
  threadId: string,
  createdAt: number,
  lastActivityAt: number,
): CommentEntry {
  const message = (timestamp: number) => ({
    authorName: "Alice",
    content: threadId,
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

// Created order is a, b; last activity order is b, a.
const LIST: EntryList = {
  entries: [entry("a", 100, 400), entry("b", 200, 300)],
  unanchoredThreadCount: 0,
};

function setup(load: () => Promise<EntryList>) {
  const root = document.createElement("div").attachShadow({ mode: "open" });
  startApp({ root, projectId: PID, load });
  const $ = <E extends Element>(selector: string) =>
    root.querySelector<E>(selector) as E;
  const shownIds = () =>
    [...root.querySelectorAll(".entry-content")].map((n) => n.textContent);
  return { root, $, shownIds };
}

describe("startApp", () => {
  it("loads and lists comments when the panel is opened", async () => {
    const load = vi.fn(async () => LIST);
    const { $, shownIds } = setup(load);
    expect($<HTMLElement>(".panel").hidden).toBe(true);
    expect(load).not.toHaveBeenCalled();

    $<HTMLButtonElement>(".toggle").click();

    expect($<HTMLElement>(".panel").hidden).toBe(false);
    await vi.waitFor(() => expect(shownIds()).toEqual(["a", "b"]));
    expect(load).toHaveBeenCalledTimes(1);
    expect($(".panel-title").textContent).toBe("Unresolved comments (2)");
  });

  it("re-sorts by the selected key and order without reloading", async () => {
    const load = vi.fn(async () => LIST);
    const { $, shownIds } = setup(load);
    $<HTMLButtonElement>(".toggle").click();
    await vi.waitFor(() => expect(shownIds()).toEqual(["a", "b"]));

    const sortKey = $<HTMLSelectElement>(".sort-key");
    sortKey.value = "created";
    sortKey.dispatchEvent(new Event("change"));
    expect(shownIds()).toEqual(["b", "a"]);

    const order = $<HTMLButtonElement>(".order");
    order.click();
    expect(shownIds()).toEqual(["a", "b"]);
    expect(order.textContent).toBe("Oldest first");

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads on demand and disables Reload while a load is pending", async () => {
    let finish: (list: EntryList) => void = () => {};
    const load = vi.fn(
      () =>
        new Promise<EntryList>((resolve) => {
          finish = resolve;
        }),
    );
    const { $, shownIds } = setup(load);
    const reload = $<HTMLButtonElement>(".reload");

    $<HTMLButtonElement>(".toggle").click();
    expect(reload.disabled).toBe(true);
    finish(LIST);
    await vi.waitFor(() => expect(reload.disabled).toBe(false));

    reload.click();
    expect(load).toHaveBeenCalledTimes(2);
    expect(reload.disabled).toBe(true);
    finish({ entries: [entry("c", 500, 500)], unanchoredThreadCount: 0 });
    await vi.waitFor(() => expect(shownIds()).toEqual(["c"]));
    expect(reload.disabled).toBe(false);
  });

  it("shows why loading failed and lets the user retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi.fn(async (): Promise<EntryList> => {
      throw new Error("threads: expected object, got array");
    });
    const { $ } = setup(load);

    $<HTMLButtonElement>(".toggle").click();

    await vi.waitFor(() =>
      expect($("[role='alert'] .error-message").textContent).toBe(
        "threads: expected object, got array",
      ),
    );
    expect($<HTMLButtonElement>(".reload").disabled).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[overleaf-comment-filter]",
      expect.any(Error),
    );
  });

  it.each([".close", ".toggle"])(
    "hides the panel with %s and loads fresh data when reopened",
    async (closer) => {
      const load = vi.fn(async () => LIST);
      const { $ } = setup(load);
      const toggle = $<HTMLButtonElement>(".toggle");
      toggle.click();
      await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));

      $<HTMLButtonElement>(closer).click();
      expect($<HTMLElement>(".panel").hidden).toBe(true);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");

      toggle.click();
      expect($<HTMLElement>(".panel").hidden).toBe(false);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(load).toHaveBeenCalledTimes(2);
    },
  );
});
