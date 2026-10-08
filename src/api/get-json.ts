import { parseJson } from "./shape";

export class HttpError extends Error {
  constructor(path: string, status: number) {
    super(`GET ${path} failed: HTTP ${status}`);
    this.name = "HttpError";
  }
}

// Same-origin GET; the browser sends the Overleaf session cookie.
export async function getJson(path: string): Promise<unknown> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new HttpError(path, response.status);
  return parseJson(await response.text(), path);
}
