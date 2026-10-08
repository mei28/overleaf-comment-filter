import { type ApiThreads, decodeThreads } from "./decode-threads";
import { getJson } from "./get-json";

// The same request Overleaf's review panel makes for comment threads.
export async function loadProjectThreads(
  projectId: string,
): Promise<ApiThreads> {
  return decodeThreads(await getJson(`/project/${projectId}/threads`));
}
