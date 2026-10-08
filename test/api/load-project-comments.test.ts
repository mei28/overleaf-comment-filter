import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProjectThreads } from "../../src/api/load-project-comments";
import threadsSample from "../fixtures/threads.sample.json";

const PID = "0123456789abcdef01234567";

function stubEndpoints(bodies: Record<string, unknown>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (path: string) => new Response(JSON.stringify(bodies[path]), {}),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadProjectThreads", () => {
  it("fetches and decodes the project's threads", async () => {
    stubEndpoints({ [`/project/${PID}/threads`]: threadsSample });
    const threads = await loadProjectThreads(PID);
    expect([...threads.keys()]).toEqual([
      "aaaaaaaaaaaaaaaaaaaa0001",
      "aaaaaaaaaaaaaaaaaaaa0002",
      "aaaaaaaaaaaaaaaaaaaa0003",
    ]);
  });

  it("passes a decode error through unchanged", async () => {
    stubEndpoints({ [`/project/${PID}/threads`]: [] });
    await expect(loadProjectThreads(PID)).rejects.toThrowError(
      "threads: expected object, got array",
    );
  });
});
