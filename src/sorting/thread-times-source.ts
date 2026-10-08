import type { ApiThreads } from "../api/decode-threads";
import type { ThreadTimes } from "../model/sort-by-time";
import { timesByThread } from "../model/thread-times";

export type TimesByThread = Map<string, ThreadTimes>;

export type ThreadTimesSource = {
  current(): TimesByThread | undefined;
  // Fetches only when nothing has been loaded yet.
  load(): Promise<TimesByThread>;
  // Fetches again, e.g. after a reply changed a thread's last activity.
  refresh(): Promise<TimesByThread>;
  // Fetches again when Overleaf shows threads this cache has not asked
  // about yet, e.g. a new comment. Never twice for the same thread id, so a
  // thread the API does not return cannot cause a refetch loop.
  refreshForUnknown(threadIds: string[]): Promise<TimesByThread | undefined>;
  // Called after every successful fetch.
  subscribe(listener: () => void): void;
};

// One cache of thread times shared by the Current file and Overview sorters.
export function createThreadTimesSource(
  loadThreads: () => Promise<ApiThreads>,
): ThreadTimesSource {
  let times: TimesByThread | undefined;
  let inFlight: Promise<TimesByThread> | undefined;
  const listeners: Array<() => void> = [];
  const requested = new Set<string>();

  // Overlapping callers share one request.
  const fetchTimes = () => {
    inFlight ??= loadThreads()
      .then((threads) => {
        times = timesByThread(threads);
        for (const listener of listeners) listener();
        return times;
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  };

  return {
    current: () => times,
    load: () => (times !== undefined ? Promise.resolve(times) : fetchTimes()),
    refresh: fetchTimes,
    async refreshForUnknown(threadIds) {
      const fresh = threadIds.filter((id) => !requested.has(id));
      if (fresh.length === 0) return undefined;
      for (const id of fresh) requested.add(id);
      return fetchTimes();
    },
    subscribe(listener) {
      listeners.push(listener);
    },
  };
}
