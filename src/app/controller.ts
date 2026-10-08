import type { EntryList } from "../model/build-entry-list";
import type { SortKey } from "../model/sort-entries";
import { createPanel } from "../ui/create-panel";
import {
  type PanelState,
  renderBody,
  type SortSetting,
} from "../ui/render-body";

export type AppOptions = {
  root: ShadowRoot;
  projectId: string;
  load: () => Promise<EntryList>;
};

export function startApp({ root, projectId, load }: AppOptions): void {
  const ui = createPanel(root);
  const sort: SortSetting = { key: "lastActivity", order: "desc" };
  let state: PanelState = { kind: "loading" };
  let isOpen = false;

  const render = () => {
    ui.body.replaceChildren(...renderBody(state, sort, projectId));
    ui.title.textContent =
      state.kind === "loaded"
        ? `Unresolved comments (${state.list.entries.length})`
        : "Unresolved comments";
  };

  // The one place errors are caught: they are shown in the panel and logged
  // with their stack, never swallowed.
  const refresh = async () => {
    state = { kind: "loading" };
    ui.reload.disabled = true;
    render();
    try {
      state = { kind: "loaded", list: await load() };
    } catch (error) {
      console.error("[overleaf-comment-filter]", error);
      state = { kind: "error", message: messageOf(error) };
    }
    ui.reload.disabled = false;
    render();
  };

  const setOpen = (open: boolean) => {
    isOpen = open;
    ui.panel.hidden = !open;
    ui.toggle.setAttribute("aria-expanded", String(open));
    // Fetch on every open so the list never shows a stale snapshot for long.
    if (open) void refresh();
  };

  ui.toggle.addEventListener("click", () => setOpen(!isOpen));
  ui.close.addEventListener("click", () => setOpen(false));

  ui.reload.addEventListener("click", () => {
    void refresh();
  });

  ui.sortKey.addEventListener("change", () => {
    // The options are created from SortKey values in createPanel.
    sort.key = ui.sortKey.value as SortKey;
    render();
  });

  ui.order.addEventListener("click", () => {
    sort.order = sort.order === "desc" ? "asc" : "desc";
    ui.order.textContent =
      sort.order === "desc" ? "Newest first" : "Oldest first";
    render();
  });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
