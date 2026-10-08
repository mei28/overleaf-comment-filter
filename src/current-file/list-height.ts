import { readEditorScroller } from "../overleaf/editor";
import { requireElement } from "../overleaf/require-element";
import { SELECTORS } from "../overleaf/selectors";

// The list is pinned to the top of the editor's scroll area; it ends where
// the review panel's tab bar begins, so the last comment is not hidden.
export function currentFileListHeight(doc: Document, win: Window): number {
  const tabBar = requireElement<HTMLElement>(
    doc,
    SELECTORS.reviewPanelFooter,
    "Review panel tab bar",
  );
  return readEditorScroller(win).clientHeight - tabBar.offsetHeight;
}
