import type { ApiThread, ApiThreads } from "../api/decode-threads";
import type { ThreadTimes } from "./sort-by-time";

// decodeThreads guarantees at least one message, in ascending time order.
export function threadTimes({ messages }: ApiThread): ThreadTimes {
  return {
    createdAt: (messages[0] as ApiThread["messages"][number]).timestamp,
    lastActivityAt: (messages.at(-1) as ApiThread["messages"][number])
      .timestamp,
  };
}

export function timesByThread(threads: ApiThreads): Map<string, ThreadTimes> {
  return new Map(
    [...threads].map(([threadId, thread]) => [threadId, threadTimes(thread)]),
  );
}
