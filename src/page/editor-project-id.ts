// Overleaf project ids are MongoDB ObjectIds: 24 lowercase hex characters.
const EDITOR_PATH = /^\/project\/([0-9a-f]{24})$/;

export function parseEditorProjectId(pathname: string): string | undefined {
  return EDITOR_PATH.exec(pathname)?.[1];
}
