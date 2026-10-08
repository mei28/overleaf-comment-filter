// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEntryList } from "../../src/app/load-entry-list";
import rangesSample from "../fixtures/ranges.sample.json";
import threadsSample from "../fixtures/threads.sample.json";

const PID = "0123456789abcdef01234567";

function stubEndpoints(): ReturnType<typeof vi.fn> {
  const bodies: Record<string, unknown> = {
    [`/project/${PID}/threads`]: threadsSample,
    [`/project/${PID}/ranges`]: rangesSample,
  };
  const fetch = vi.fn(
    async (path: string) => new Response(JSON.stringify(bodies[path])),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.replaceChildren();
});

describe("loadEntryList", () => {
  it("lists the unresolved, anchored threads of the project", async () => {
    stubEndpoints();
    const list = await loadEntryList(PID, document);
    expect(list.entries.map((entry) => entry.threadId)).toEqual([
      "aaaaaaaaaaaaaaaaaaaa0001",
      "aaaaaaaaaaaaaaaaaaaa0002",
    ]);
    expect(list.unanchoredThreadCount).toBe(0);
  });

  it("refuses a stage 1 project before requesting anything", async () => {
    const fetch = stubEndpoints();
    const meta = document.createElement("meta");
    meta.name = "ol-otMigrationStage";
    meta.content = "1";
    document.head.append(meta);

    await expect(loadEntryList(PID, document)).rejects.toThrowError(
      /history migration stage 1/,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
