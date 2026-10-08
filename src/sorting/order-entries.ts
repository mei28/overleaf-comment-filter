import {
  type SortSetting,
  sortByTime,
  type ThreadTimes,
} from "../model/sort-by-time";
import { SELECTORS } from "../overleaf/selectors";

export type OrderResult = {
  // Threads rendered by Overleaf that the fetched data does not know yet,
  // e.g. a comment added after the fetch.
  unknownThreadIds: string[];
};

type TimedEntry = { el: HTMLElement; times: ThreadTimes };

// Reorders the entries of one flex container visually with CSS `order`.
// React never reads `order`, so Overleaf's DOM stays untouched.
export function orderEntries(
  container: Element,
  setting: SortSetting,
  timesOf: (threadId: string) => ThreadTimes | undefined,
  readThreadId: (entry: Element) => string,
): OrderResult {
  const unknownThreadIds: string[] = [];
  const timed: TimedEntry[] = [];
  const untimed: HTMLElement[] = [];
  // Tracked changes are a different kind of entry; they follow the comments
  // in Overleaf's order.
  const others: HTMLElement[] = [];
  for (const el of container.children as HTMLCollectionOf<HTMLElement>) {
    if (!el.matches(SELECTORS.commentEntry)) {
      others.push(el);
      continue;
    }
    const threadId = readThreadId(el);
    const times = timesOf(threadId);
    if (times === undefined) {
      unknownThreadIds.push(threadId);
      untimed.push(el);
    } else {
      timed.push({ el, times });
    }
  }
  const sorted = sortByTime(timed, (entry) => entry.times, setting).map(
    (entry) => entry.el,
  );
  [...sorted, ...untimed, ...others].forEach((el, index) => {
    el.style.order = String(index);
  });
  return { unknownThreadIds };
}

function clearEntriesOrder(container: Element): void {
  for (const el of container.children as HTMLCollectionOf<HTMLElement>) {
    el.style.removeProperty("order");
  }
}

// Each file of the Overview tab is its own flex container.
export function orderOverviewEntries(
  overview: Element,
  setting: SortSetting,
  timesOf: (threadId: string) => ThreadTimes | undefined,
  readThreadId: (entry: Element) => string,
): OrderResult {
  const unknownThreadIds: string[] = [];
  for (const group of overview.querySelectorAll(
    SELECTORS.overviewFileEntries,
  )) {
    const result = orderEntries(group, setting, timesOf, readThreadId);
    unknownThreadIds.push(...result.unknownThreadIds);
  }
  return { unknownThreadIds };
}

export function clearOverviewOrder(overview: Element): void {
  for (const group of overview.querySelectorAll(
    SELECTORS.overviewFileEntries,
  )) {
    clearEntriesOrder(group);
  }
}
