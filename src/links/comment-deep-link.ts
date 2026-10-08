// Overleaf reads `doc` and `comment` on page load, opens the doc and focuses
// the thread in the review panel (overleaf/overleaf#36546).
export function commentDeepLink(
  projectId: string,
  docId: string,
  threadId: string,
): string {
  const query = new URLSearchParams({ doc: docId, comment: threadId });
  return `/project/${projectId}?${query}`;
}
