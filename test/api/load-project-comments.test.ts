import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProjectComments } from "../../src/api/load-project-comments";
import rangesSample from "../fixtures/ranges.sample.json";
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

describe("loadProjectComments", () => {
  it("fetches and decodes the project's threads and ranges", async () => {
    stubEndpoints({
      [`/project/${PID}/threads`]: threadsSample,
      [`/project/${PID}/ranges`]: rangesSample,
    });
    const { threads, ranges } = await loadProjectComments(PID);
    expect([...threads.keys()]).toEqual([
      "aaaaaaaaaaaaaaaaaaaa0001",
      "aaaaaaaaaaaaaaaaaaaa0002",
      "aaaaaaaaaaaaaaaaaaaa0003",
    ]);
    expect(ranges.map((doc) => doc.docId)).toEqual([
      "dddddddddddddddddddd0001",
      "dddddddddddddddddddd0002",
      "dddddddddddddddddddd0003",
    ]);
  });

  it("passes a decode error through unchanged", async () => {
    stubEndpoints({
      [`/project/${PID}/threads`]: [],
      [`/project/${PID}/ranges`]: rangesSample,
    });
    await expect(loadProjectComments(PID)).rejects.toThrowError(
      "threads: expected object, got array",
    );
  });
});
