import { loadProjectThreads } from "./api/load-project-comments";
import { watchPage } from "./app/page-watcher";
import { createCurrentFileSorting } from "./current-file/current-file-sorting";
import { currentFileListHeight } from "./current-file/list-height";
import { scanCurrentFile } from "./current-file/scan-current-file";
import { ensureSortButton, showSortState } from "./header/sort-button";
import { createSortMenu } from "./header/sort-menu";
import type { SortPreset } from "./model/sort-presets";
import { readCommentThreadId } from "./overleaf/comment-fiber";
import { readOpenDocId } from "./overleaf/editor";
import { createOverviewSorting } from "./overview/overview-sorting";
import { parseEditorProjectId } from "./page/editor-project-id";
import { combineStatuses, type SorterStatus } from "./sorting/sorter-status";
import { createThreadTimesSource } from "./sorting/thread-times-source";
import { injectStyles } from "./ui/inject-styles";
import { waitForPaint } from "./ui/wait-for-paint";

// Replies settle for this long before thread times are fetched again.
const RELOAD_DELAY_MS = 1000;

const projectId = parseEditorProjectId(location.pathname);

// @match also covers project sub-pages such as the detached PDF viewer.
if (projectId !== undefined) start(projectId);

function start(projectId: string): void {
  injectStyles(document);
  const times = createThreadTimesSource(() => loadProjectThreads(projectId));
  let preset: SortPreset = "document";
  const statuses: Record<"currentFile" | "overview", SorterStatus> = {
    currentFile: { kind: "idle" },
    overview: { kind: "idle" },
  };
  let button: HTMLButtonElement | undefined;

  const menu = createSortMenu((next) => {
    preset = next;
    currentFile.setPreset(next);
    overview.setPreset(next);
    showState();
  });
  document.body.append(menu.element);

  const showState = () => {
    const status = combineStatuses(Object.values(statuses));
    menu.update(preset, status);
    if (button !== undefined) showSortState(button, preset, status);
  };

  const currentFile = createCurrentFileSorting({
    doc: document,
    times,
    readThreadId: readCommentThreadId,
    renderAll: () => scanCurrentFile(document, window, waitForPaint),
    openDocId: () => readOpenDocId(window),
    listHeight: () => currentFileListHeight(document, window),
    reloadDelayMs: RELOAD_DELAY_MS,
    onStatus: (status) => {
      statuses.currentFile = status;
      showState();
    },
  });

  const overview = createOverviewSorting({
    doc: document,
    times,
    readThreadId: readCommentThreadId,
    reloadDelayMs: RELOAD_DELAY_MS,
    onStatus: (status) => {
      statuses.overview = status;
      showState();
    },
  });

  // Runs on every page change, so it only looks things up; state is drawn
  // again only for a newly inserted header button.
  const sync = () => {
    const current = ensureSortButton(document, (anchor) => menu.toggle(anchor));
    if (current !== button) {
      button = current;
      showState();
    }
    menu.closeIfDetached();
    currentFile.sync();
    overview.sync();
  };

  // Overleaf dispatches editor:geometry-change when the editor is resized,
  // e.g. by dragging the PDF divider.
  window.addEventListener("resize", () => currentFile.resize());
  window.addEventListener("editor:geometry-change", () => currentFile.resize());

  showState();
  watchPage(document, sync);
  sync();
}
