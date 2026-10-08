import { commentDeepLink } from "../links/comment-deep-link";
import type { CommentEntry } from "../model/build-entry-list";
import { element, timeElement } from "./element";

export function renderEntry(
  entry: CommentEntry,
  projectId: string,
): HTMLLIElement {
  const { firstMessage } = entry;
  const link = element(
    "a",
    "entry-link",
    ...quote(entry.highlightedText),
    element(
      "div",
      "entry-meta",
      firstMessage.authorName,
      " · ",
      timeElement(firstMessage.timestamp),
    ),
    element("p", "entry-content", firstMessage.content),
    ...activity(entry),
  );
  link.href = commentDeepLink(projectId, entry.docId, entry.threadId);
  return element("li", "entry", link);
}

// The highlighted text is empty when the commented text was deleted.
function quote(highlightedText: string): HTMLElement[] {
  if (highlightedText === "") return [];
  return [element("blockquote", "entry-quote", highlightedText)];
}

function activity({ replyCount, lastMessage }: CommentEntry): HTMLElement[] {
  if (replyCount === 0) return [];
  const replies = replyCount === 1 ? "1 reply" : `${replyCount} replies`;
  return [
    element(
      "div",
      "entry-activity",
      `${replies} · last by ${lastMessage.authorName} · `,
      timeElement(lastMessage.timestamp),
    ),
  ];
}
