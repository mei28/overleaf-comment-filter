import { errorMessage } from "../format/error-message";
import {
  isTimePreset,
  presetSetting,
  type SortPreset,
} from "../model/sort-presets";
import { SELECTORS } from "../overleaf/selectors";
import {
  clearOverviewOrder,
  orderOverviewEntries,
} from "../sorting/order-entries";
import type { SorterStatus, TabSorter } from "../sorting/sorter-status";
import type { ThreadTimesSource } from "../sorting/thread-times-source";
import { isOwnChange } from "../ui/own-change";

export type OverviewSortingOptions = {
  doc: Document;
  times: ThreadTimesSource;
  readThreadId: (entry: Element) => string;
  reloadDelayMs: number;
  onStatus: (status: SorterStatus) => void;
};

// Orders the comments of each file in the review panel's Overview tab.
export function createOverviewSorting({
  doc,
  times,
  readThreadId,
  reloadDelayMs,
  onStatus,
}: OverviewSortingOptions): TabSorter {
  let preset: SortPreset = "document";
  let root: Element | null = null;
  let observer: MutationObserver | undefined;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  // Set when the current preset failed; cleared when a preset is chosen, so
  // a broken assumption is reported once instead of on every page change.
  let failed = false;

  // Reports why sorting stopped and leaves Overleaf's own order in place.
  const fail = (error: unknown) => {
    failed = true;
    console.error("[overleaf-comment-filter]", error);
    onStatus({ kind: "error", message: errorMessage(error) });
    if (root !== null) clearOverviewOrder(root);
  };

  const apply = () => {
    if (root === null) return;
    if (!isTimePreset(preset)) {
      clearOverviewOrder(root);
      onStatus({ kind: "idle" });
      return;
    }
    const known = times.current();
    if (known === undefined) {
      onStatus({ kind: "loading" });
      times.load().catch(fail);
      return;
    }
    let unknownThreadIds: string[];
    try {
      ({ unknownThreadIds } = orderOverviewEntries(
        root,
        presetSetting(preset),
        (threadId) => known.get(threadId),
        readThreadId,
      ));
    } catch (error) {
      fail(error);
      return;
    }
    onStatus({ kind: "idle" });
    times.refreshForUnknown(unknownThreadIds).catch(fail);
  };

  // Every fetch, from either tab, may change the order.
  times.subscribe(() => {
    if (!failed) apply();
  });

  // Overleaf re-renders entries (collapse/expand, new replies), which drops
  // their `order`; watch the Overview root and order them again.
  const observe = (overview: Element) => {
    observer?.disconnect();
    observer = new MutationObserver((records) => {
      const changes = records.filter((record) => !isOwnChange(record));
      if (changes.length === 0 || failed) return;
      apply();
      // Changes inside an entry (a reply, an edit) can move its last
      // activity; refetch once they settle.
      if (isTimePreset(preset) && changes.some(isInsideEntry)) {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(
          () => times.refresh().catch(fail),
          reloadDelayMs,
        );
      }
    });
    observer.observe(overview, { childList: true, subtree: true });
  };

  return {
    sync() {
      const current = doc.querySelector(SELECTORS.overviewRoot);
      if (current === root) return;
      root = current;
      if (root === null) {
        observer?.disconnect();
        return;
      }
      observe(root);
      apply();
    },
    setPreset(next) {
      preset = next;
      failed = false;
      apply();
    },
  };
}

function isInsideEntry(record: MutationRecord): boolean {
  return (record.target as Element).closest?.(SELECTORS.reviewEntry) != null;
}
