import { readEditorView } from "../overleaf/editor";
import { renderAllComments } from "./render-all-comments";
import { showScanOverlay } from "./scan-overlay";

// Renders every comment of the open file behind an overlay that tells the
// user the editor is scrolling by itself. The overlay always goes away, also
// when the scan fails.
export async function scanCurrentFile(
  doc: Document,
  win: Window,
  waitForPaint: () => Promise<void>,
): Promise<void> {
  const view = readEditorView(win);
  const overlay = showScanOverlay(doc, view.dom);
  try {
    await renderAllComments(view, waitForPaint, overlay.update);
  } finally {
    overlay.remove();
  }
}
