import { expect, it } from "vitest";
import { renderAllComments } from "../../src/current-file/render-all-comments";

it("scrolls through the document in steps, reporting progress, then restores the view", async () => {
  const events: string[] = [];
  let top = 30;
  const editor = {
    scrollDOM: {
      get scrollTop() {
        return top;
      },
      set scrollTop(value: number) {
        top = value;
        events.push(`scroll ${value}`);
      },
      scrollHeight: 2000,
      clientHeight: 500,
    },
    // CodeMirror's snapshot is anchored to a document position, so it
    // survives line heights changing while the document is scanned.
    scrollSnapshot: () => "snapshot-at-30",
    dispatch: (spec: { effects: unknown }) => {
      events.push(`dispatch ${spec.effects}`);
    },
  };

  await renderAllComments(
    editor,
    async () => {
      events.push("wait");
    },
    (done, total) => events.push(`progress ${done}/${total}`),
  );

  expect(events).toEqual([
    "scroll 0",
    "wait",
    "progress 1/6",
    "scroll 400",
    "wait",
    "progress 2/6",
    "scroll 800",
    "wait",
    "progress 3/6",
    "scroll 1200",
    "wait",
    "progress 4/6",
    "scroll 1600",
    "wait",
    "progress 5/6",
    "scroll 2000",
    "wait",
    "progress 6/6",
    "dispatch snapshot-at-30",
    "wait",
  ]);
});

it("keeps going when the document grows as lines are measured", async () => {
  const scrolled: number[] = [];
  let top = 0;
  let height = 1000;
  const editor = {
    scrollDOM: {
      get scrollTop() {
        return top;
      },
      set scrollTop(value: number) {
        top = value;
        scrolled.push(value);
        // Measured lines turn out taller than CodeMirror's estimate.
        height = 1000 + scrolled.length * 300;
      },
      get scrollHeight() {
        return height;
      },
      clientHeight: 500,
    },
    scrollSnapshot: () => "snapshot",
    dispatch: () => {},
  };

  await renderAllComments(
    editor,
    async () => {},
    () => {},
  );

  expect(scrolled.at(-1)).toBeGreaterThanOrEqual(height - 400);
});
