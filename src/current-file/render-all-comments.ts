export type Scroller = {
  scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
};

// The parts of CodeMirror's EditorView the scan uses.
export type ScannableEditor = {
  scrollDOM: Scroller;
  scrollSnapshot(): unknown;
  dispatch(spec: { effects: unknown }): void;
};

// Overlap between steps, so no line is skipped between two viewports.
const STEP_RATIO = 0.8;

// The Current file tab only renders comments whose text CodeMirror has laid
// out, and keeps them once measured. Scrolling through the document once
// makes every comment render. The view is then restored from a snapshot
// anchored to the document position, which stays correct even though line
// heights change as lines are measured during the scan.
export async function renderAllComments(
  editor: ScannableEditor,
  waitForPaint: () => Promise<void>,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const snapshot = editor.scrollSnapshot();
  const { scrollDOM } = editor;
  const step = Math.max(1, Math.floor(scrollDOM.clientHeight * STEP_RATIO));
  // The document can grow while lines are measured, so the number of steps
  // is worked out again after each one.
  const stepsNeeded = () => Math.floor(scrollDOM.scrollHeight / step) + 1;
  for (let index = 0; index < stepsNeeded(); index += 1) {
    scrollDOM.scrollTop = index * step;
    await waitForPaint();
    onProgress(index + 1, stepsNeeded());
  }
  editor.dispatch({ effects: snapshot });
  await waitForPaint();
}
