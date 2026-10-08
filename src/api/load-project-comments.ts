import { type ApiDocRanges, decodeRanges } from "./decode-ranges";
import { type ApiThreads, decodeThreads } from "./decode-threads";
import { getJson } from "./get-json";

export type ProjectComments = {
  threads: ApiThreads;
  ranges: ApiDocRanges[];
};

// The same two endpoints Overleaf's review panel reads.
export async function loadProjectComments(
  projectId: string,
): Promise<ProjectComments> {
  const [threads, ranges] = await Promise.all([
    getJson(`/project/${projectId}/threads`),
    getJson(`/project/${projectId}/ranges`),
  ]);
  return { threads: decodeThreads(threads), ranges: decodeRanges(ranges) };
}
