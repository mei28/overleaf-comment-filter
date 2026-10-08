import { loadProjectComments } from "../api/load-project-comments";
import { buildEntryList, type EntryList } from "../model/build-entry-list";
import {
  assertSupportedOtMigrationStage,
  readOtMigrationStage,
} from "../page/ot-migration-stage";

export async function loadEntryList(
  projectId: string,
  doc: Document,
): Promise<EntryList> {
  assertSupportedOtMigrationStage(readOtMigrationStage(doc));
  const { threads, ranges } = await loadProjectComments(projectId);
  return buildEntryList(threads, ranges);
}
