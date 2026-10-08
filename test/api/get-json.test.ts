import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson } from "../../src/api/get-json";

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetch = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getJson", () => {
  it("returns the parsed JSON body of a GET request", async () => {
    const fetch = stubFetch(new Response('{"a":1}', { status: 200 }));
    await expect(getJson("/project/p/threads")).resolves.toEqual({ a: 1 });
    expect(fetch).toHaveBeenCalledWith("/project/p/threads", {
      headers: { Accept: "application/json" },
    });
  });

  it("rejects a non-2xx response with the path and status", async () => {
    stubFetch(new Response("Forbidden", { status: 403 }));
    await expect(getJson("/project/p/threads")).rejects.toThrowError(
      "GET /project/p/threads failed: HTTP 403",
    );
  });

  it("rejects a body that is not JSON, naming the path", async () => {
    stubFetch(new Response("<html>", { status: 200 }));
    await expect(getJson("/project/p/threads")).rejects.toThrowError(
      "/project/p/threads: expected JSON, got unparsable text",
    );
  });
});
