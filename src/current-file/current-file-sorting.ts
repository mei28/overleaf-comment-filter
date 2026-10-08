import { errorMessage } from "../format/error-message";
import {
  isTimePreset,
  presetSetting,
  type SortPreset,
} from "../model/sort-presets";
import { requireElement } from "../overleaf/require-element";
import { SELECTORS } from "../overleaf/selectors";
import { orderEntries } from "../sorting/order-entries";
import type { SorterStatus, TabSorter } from "../sorting/sorter-status";
import type { ThreadTimesSource } from "../sorting/thread-times-source";
import { isOwnChange } from "../ui/own-change";

export type CurrentFileSortingOptions = {
  doc: Document;
  times: ThreadTimesSource;
  readThreadId: (entry: Element) => string;
  renderAll: () => Promise<void>;
  openDocId: () => string;
  listHeight: () => number;
  reloadDelayMs: number;
  onStatus: (status: SorterStatus) => void;
};

export type CurrentFileSorter = TabSorter & {
  // Fits the list to the panel again, e.g. after the window was resized.
  resize(): void;
};

// Turns the review panel's Current file tab into a time-ordered list. The
// list layout itself is CSS keyed on data-ocf-mode (styles.css).
export function createCurrentFileSorting({
  doc,
  times,
  readThreadId,
  renderAll,
  openDocId,
  listHeight,
  reloadDelayMs,
  onStatus,
}: CurrentFileSortingOptions): CurrentFileSorter {
  let preset: SortPreset = "document";
  let root: HTMLElement | null = null;
  // The doc whose comments have all been rendered by scrolling through it.
  let renderedDocId: string | undefined;
  let rendering = false;
  // Set when the current preset failed; cleared when a preset is chosen, so
  // a broken assumption is reported once instead of on every page change.
  let failed = false;
  let observer: MutationObserver | undefined;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;

  const order = async (tab: HTMLElement) => {
    if (!isTimePreset(preset)) return;
    const docId = openDocId();
    if (docId !== renderedDocId) {
      if (rendering) return;
      rendering = true;
      onStatus({ kind: "loading" });
      try {
        await renderAll();
      } finally {
        rendering = false;
      }
      renderedDocId = docId;
    }
    const known = times.current() ?? (await times.load());
    // The preset may have changed while rendering or loading.
    if (!isTimePreset(preset)) return;
    tab.dataset.ocfMode = "time";
    tab.style.setProperty("--ocf-list-height", `${listHeight()}px`);
    const { unknownThreadIds } = orderEntries(
      requireElement(tab, SELECTORS.currentFileEntries, "Current file tab"),
      presetSetting(preset),
      (threadId) => known.get(threadId),
      readThreadId,
    );
    onStatus({ kind: "idle" });
    await times.refreshForUnknown(unknownThreadIds);
  };

  // Reports why sorting stopped and leaves Overleaf's own layout in place.
  const fail = (tab: HTMLElement, error: unknown) => {
    failed = true;
    console.error("[overleaf-comment-filter]", error);
    onStatus({ kind: "error", message: errorMessage(error) });
    restoreLayout(tab);
  };

  const apply = () => {
    if (root === null) return;
    const tab = root;
    if (!isTimePreset(preset)) {
      restoreLayout(tab);
      onStatus({ kind: "idle" });
      return;
    }
    order(tab).catch((error) => fail(tab, error));
  };

  // Every fetch, from either tab, may change the order.
  times.subscribe(() => {
    if (!failed) apply();
  });

  // New comments and replies change the entries; order them again, and
  // refetch once replies settle since they move a thread's last activity.
  const observe = (tab: HTMLElement) => {
    observer?.disconnect();
    observer = new MutationObserver((records) => {
      const changes = records.filter((record) => !isOwnChange(record));
      if (changes.length === 0 || !isTimePreset(preset) || failed) return;
      apply();
      if (changes.some(isInsideEntry)) {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(
          () => times.refresh().catch((error) => fail(tab, error)),
          reloadDelayMs,
        );
      }
    });
    observer.observe(tab, { childList: true, subtree: true });
  };

  return {
    sync() {
      const current = doc.querySelector<HTMLElement>(SELECTORS.currentFileRoot);
      const tabChanged = current !== root;
      root = current;
      if (tabChanged) {
        if (root === null) observer?.disconnect();
        else observe(root);
      }
      if (tabChanged) {
        apply();
        return;
      }
      if (root === null || !isTimePreset(preset) || failed) return;
      // Opening another file keeps the tab but swaps its entries.
      let docChanged: boolean;
      try {
        docChanged = openDocId() !== renderedDocId;
      } catch (error) {
        fail(root, error);
        return;
      }
      if (docChanged) apply();
    },
    setPreset(next) {
      preset = next;
      failed = false;
      apply();
    },
    resize() {
      if (root?.dataset.ocfMode !== "time") return;
      root.style.setProperty("--ocf-list-height", `${listHeight()}px`);
    },
  };
}

function restoreLayout(tab: HTMLElement): void {
  delete tab.dataset.ocfMode;
  tab.style.removeProperty("--ocf-list-height");
  for (const entry of tab.querySelectorAll<HTMLElement>(
    SELECTORS.reviewEntry,
  )) {
    entry.style.removeProperty("order");
  }
}

function isInsideEntry(record: MutationRecord): boolean {
  return (record.target as Element).closest?.(SELECTORS.reviewEntry) != null;
}
