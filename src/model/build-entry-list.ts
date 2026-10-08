import type { ApiDocRanges } from "../api/decode-ranges";
import type { ApiMessage, ApiThreads } from "../api/decode-threads";
import { authorName } from "./author-name";

export type EntryMessage = {
  authorName: string;
  content: string;
  timestamp: number;
};

export type CommentEntry = {
  threadId: string;
  docId: string;
  highlightedText: string;
  firstMessage: EntryMessage;
  lastMessage: EntryMessage;
  replyCount: number;
};

export type EntryList = {
  entries: CommentEntry[];
  unanchoredThreadCount: number;
};

export function buildEntryList(
  threads: ApiThreads,
  ranges: ApiDocRanges[],
): EntryList {
  const entries: CommentEntry[] = [];
  for (const { docId, comments } of ranges) {
    for (const { threadId, highlightedText } of comments) {
      const thread = threads.get(threadId);
      // A range whose thread was deleted; Overleaf does not show it either.
      if (thread === undefined) continue;
      if (thread.resolved) continue;
      // decodeThreads guarantees at least one message per thread.
      entries.push({
        threadId,
        docId,
        highlightedText,
        firstMessage: entryMessage(thread.messages[0] as ApiMessage),
        lastMessage: entryMessage(thread.messages.at(-1) as ApiMessage),
        replyCount: thread.messages.length - 1,
      });
    }
  }
  return {
    entries,
    unanchoredThreadCount: countUnanchoredThreads(threads, ranges),
  };
}

// Unresolved threads that no doc range points to, e.g. after the commented
// text was deleted. Overleaf's panel cannot show them either.
function countUnanchoredThreads(
  threads: ApiThreads,
  ranges: ApiDocRanges[],
): number {
  const anchored = new Set(
    ranges.flatMap(({ comments }) => comments.map(({ threadId }) => threadId)),
  );
  let count = 0;
  for (const [threadId, thread] of threads) {
    if (!thread.resolved && !anchored.has(threadId)) count += 1;
  }
  return count;
}

function entryMessage(message: ApiMessage): EntryMessage {
  return {
    authorName: authorName(message.user),
    content: message.content,
    timestamp: message.timestamp,
  };
}
