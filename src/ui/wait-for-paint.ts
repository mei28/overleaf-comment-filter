// Gives CodeMirror and the review panel time to lay out and measure after a
// scroll: two animation frames, then a pause longer than the panel's 50ms
// position debounce (review-panel-current-file.tsx).
const SETTLE_MS = 80;

export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(resolve, SETTLE_MS)),
    );
  });
}
