import { isOwnChange } from "../ui/own-change";

// One observer for the whole page. Overleaf's editor mutates the DOM on every
// keystroke, so onChange must stay cheap; it only looks things up.
export function watchPage(doc: Document, onChange: () => void): () => void {
  const observer = new MutationObserver((records) => {
    if (records.every(isOwnChange)) return;
    onChange();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
