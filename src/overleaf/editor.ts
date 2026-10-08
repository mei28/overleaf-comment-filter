import { OverleafUiError } from "./overleaf-ui-error";

type Store = { get(path: string): unknown };
type OverleafWindow = Window & {
  overleaf?: { unstable?: { store?: Store } };
};

const PURPOSE = "Overleaf editor";

// Overleaf exposes `window.overleaf.unstable.store` for browser extensions
// (ide-context.tsx); it is documented as unstable.
function store(win: Window): Store {
  const found = (win as OverleafWindow).overleaf?.unstable?.store;
  if (found === undefined) {
    throw new OverleafUiError(
      `${PURPOSE}: window.overleaf.unstable.store not found`,
    );
  }
  return found;
}

export function readEditorScroller(win: Window): HTMLElement {
  const view = store(win).get("editor.view") as
    | { scrollDOM?: unknown }
    | undefined;
  if (!(view?.scrollDOM instanceof HTMLElement)) {
    throw new OverleafUiError(`${PURPOSE}: editor.view.scrollDOM not found`);
  }
  return view.scrollDOM;
}

export function readOpenDocId(win: Window): string {
  const docId = store(win).get("editor.open_doc_id");
  if (typeof docId !== "string") {
    throw new OverleafUiError(`${PURPOSE}: editor.open_doc_id not found`);
  }
  return docId;
}

// The CodeMirror EditorView parts the Current file scan uses.
export type EditorView = {
  dom: HTMLElement;
  scrollDOM: HTMLElement;
  scrollSnapshot(): unknown;
  dispatch(spec: { effects: unknown }): void;
};

export function readEditorView(win: Window): EditorView {
  const view = store(win).get("editor.view") as Partial<EditorView> | undefined;
  for (const key of ["dom", "scrollDOM"] as const) {
    if (!(view?.[key] instanceof HTMLElement)) {
      throw new OverleafUiError(`${PURPOSE}: editor.view.${key} not found`);
    }
  }
  for (const key of ["scrollSnapshot", "dispatch"] as const) {
    if (typeof view?.[key] !== "function") {
      throw new OverleafUiError(`${PURPOSE}: editor.view.${key} not found`);
    }
  }
  return view as EditorView;
}
