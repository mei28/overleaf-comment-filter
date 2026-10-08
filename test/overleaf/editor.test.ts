// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
  readEditorScroller,
  readEditorView,
  readOpenDocId,
} from "../../src/overleaf/editor";

type Win = Window & { overleaf?: unknown };

function exposeStore(values: Record<string, unknown>): void {
  (window as Win).overleaf = {
    unstable: { store: { get: (path: string) => values[path] } },
  };
}

afterEach(() => {
  delete (window as Win).overleaf;
});

describe("Overleaf editor access", () => {
  it("reads the editor's scroll container and the open doc id", () => {
    const scrollDOM = document.createElement("div");
    exposeStore({ "editor.view": { scrollDOM }, "editor.open_doc_id": "d1" });
    expect(readEditorScroller(window)).toBe(scrollDOM);
    expect(readOpenDocId(window)).toBe("d1");
  });
});

describe("Overleaf editor access errors", () => {
  it("names the missing store", () => {
    expect(() => readOpenDocId(window)).toThrowError(
      "Overleaf editor: window.overleaf.unstable.store not found",
    );
  });

  it("names a missing store value", () => {
    exposeStore({});
    expect(() => readEditorScroller(window)).toThrowError(
      "Overleaf editor: editor.view.scrollDOM not found",
    );
    expect(() => readOpenDocId(window)).toThrowError(
      "Overleaf editor: editor.open_doc_id not found",
    );
  });
});

describe("readEditorView", () => {
  it("returns the view the scan needs", () => {
    const view = {
      dom: document.createElement("div"),
      scrollDOM: document.createElement("div"),
      scrollSnapshot: () => "snapshot",
      dispatch: () => {},
    };
    exposeStore({ "editor.view": view });
    expect(readEditorView(window)).toBe(view);
  });

  it("names a view without scroll snapshots", () => {
    exposeStore({
      "editor.view": {
        dom: document.createElement("div"),
        scrollDOM: document.createElement("div"),
        dispatch: () => {},
      },
    });
    expect(() => readEditorView(window)).toThrowError(
      "Overleaf editor: editor.view.scrollSnapshot not found",
    );
  });
});
