import type { CommentEntry, EntryList } from "../model/build-entry-list";
import {
  type SortKey,
  type SortOrder,
  sortEntries,
} from "../model/sort-entries";
import { element } from "./element";
import { renderEntry } from "./render-entry";

export type PanelState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; list: EntryList };

export type SortSetting = { key: SortKey; order: SortOrder };

const ISSUES_URL = "https://github.com/mei28/overleaf-comment-filter/issues";

export function renderBody(
  state: PanelState,
  sort: SortSetting,
  projectId: string,
): Node[] {
  switch (state.kind) {
    case "loading":
      return [renderLoading()];
    case "error":
      return [renderError(state.message)];
    case "loaded":
      return renderList(state.list, sort, projectId);
  }
}

function renderList(
  { entries, unanchoredThreadCount }: EntryList,
  sort: SortSetting,
  projectId: string,
): HTMLElement[] {
  return [
    renderEntries(entries, sort, projectId),
    ...unanchoredNote(unanchoredThreadCount),
  ];
}

function renderEntries(
  entries: CommentEntry[],
  sort: SortSetting,
  projectId: string,
): HTMLElement {
  if (entries.length === 0) {
    return element("p", "status", "No unresolved comments in any file.");
  }
  const items = sortEntries(entries, sort.key, sort.order).map((entry) =>
    renderEntry(entry, projectId),
  );
  return element("ol", "entries", ...items);
}

// Threads without a range cannot be linked to; say how many are left out
// instead of dropping them silently.
function unanchoredNote(count: number): HTMLElement[] {
  if (count === 0) return [];
  const text =
    count === 1
      ? "1 unresolved thread has no position in any file and is not listed."
      : `${count} unresolved threads have no position in any file and are not listed.`;
  return [element("p", "unanchored-note", text)];
}

function renderLoading(): HTMLElement {
  const loading = element("p", "status", "Loading comments…");
  loading.setAttribute("aria-busy", "true");
  return loading;
}

function renderError(message: string): HTMLElement {
  const report = element("a", "error-report", "Report an issue");
  report.href = ISSUES_URL;
  report.target = "_blank";
  report.rel = "noopener";
  const alert = element(
    "div",
    "error",
    element("p", "error-title", "Could not load comments."),
    element("p", "error-message", message),
    report,
  );
  alert.setAttribute("role", "alert");
  return alert;
}
