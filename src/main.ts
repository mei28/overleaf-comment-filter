import { startApp } from "./app/controller";
import { loadEntryList } from "./app/load-entry-list";
import { parseEditorProjectId } from "./page/editor-project-id";
import { mountShadowRoot } from "./ui/mount-shadow-root";

const projectId = parseEditorProjectId(location.pathname);

// @match also covers project sub-pages such as the detached PDF viewer.
if (projectId !== undefined) {
  startApp({
    root: mountShadowRoot(),
    projectId,
    load: () => loadEntryList(projectId, document),
  });
}
