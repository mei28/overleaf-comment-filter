import { element } from "../ui/element";

export type ScanOverlay = {
  update(done: number, total: number): void;
  remove(): void;
};

// Shown while the Current file scan scrolls the editor by itself: it says
// what is happening, takes clicks and wheel events, holds key presses so no
// text is typed into the document, and gives focus back afterwards.
export function showScanOverlay(doc: Document, area: HTMLElement): ScanOverlay {
  const progress = element("p", "ocf-scan-progress", "Starting…");
  const spinner = element("div", "spinner-border spinner-border-sm");
  spinner.setAttribute("aria-hidden", "true");
  const overlay = element(
    "div",
    "ocf-scan-overlay",
    element(
      "div",
      "ocf-scan-card",
      spinner,
      element("p", "ocf-scan-title", "Collecting comments to sort…"),
      element(
        "p",
        "ocf-scan-hint",
        "Please don't scroll or type until this finishes. You will be returned to where you were.",
      ),
      progress,
    ),
  );
  overlay.dataset.ocf = "scan-overlay";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("aria-busy", "true");
  const rect = area.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: "fixed",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });

  const holdKey = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const focused = doc.activeElement as HTMLElement | null;
  focused?.blur();
  doc.addEventListener("keydown", holdKey, true);
  doc.body.append(overlay);

  return {
    update(done, total) {
      progress.textContent = `Step ${done} of ${total}`;
    },
    remove() {
      doc.removeEventListener("keydown", holdKey, true);
      overlay.remove();
      focused?.focus({ preventScroll: true });
    },
  };
}
