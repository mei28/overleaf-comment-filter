import { describe, expect, it, vi } from "vitest";
import type { ApiThread, ApiThreads } from "../../src/api/decode-threads";
import { createThreadTimesSource } from "../../src/sorting/thread-times-source";

function thread(createdAt: number, lastActivityAt: number): ApiThread {
  const message = (timestamp: number) => ({
    content: "",
    timestamp,
    user: undefined,
  });
  return {
    messages: [message(createdAt), message(lastActivityAt)],
    resolved: false,
  };
}

const THREADS: ApiThreads = new Map([["a", thread(100, 300)]]);

describe("createThreadTimesSource", () => {
  it("loads thread times once and keeps them", async () => {
    const loadThreads = vi.fn(async () => THREADS);
    const source = createThreadTimesSource(loadThreads);
    expect(source.current()).toBeUndefined();

    const times = await source.load();
    await source.load();

    expect(times.get("a")).toEqual({ createdAt: 100, lastActivityAt: 300 });
    expect(source.current()).toBe(times);
    expect(loadThreads).toHaveBeenCalledTimes(1);
  });
});

describe("createThreadTimesSource in flight", () => {
  it("shares one request between overlapping loads", async () => {
    const loadThreads = vi.fn(async () => THREADS);
    const source = createThreadTimesSource(loadThreads);
    await Promise.all([source.load(), source.load()]);
    expect(loadThreads).toHaveBeenCalledTimes(1);
  });
});

describe("createThreadTimesSource refresh", () => {
  it("refetches and tells every subscriber", async () => {
    const replied: ApiThreads = new Map([["a", thread(100, 900)]]);
    const loadThreads = vi
      .fn<() => Promise<ApiThreads>>()
      .mockResolvedValueOnce(THREADS)
      .mockResolvedValueOnce(replied);
    const source = createThreadTimesSource(loadThreads);
    const first = vi.fn();
    const second = vi.fn();
    source.subscribe(first);
    source.subscribe(second);
    await source.load();

    await source.refresh();

    expect(source.current()?.get("a")?.lastActivityAt).toBe(900);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
  });
});

describe("createThreadTimesSource unknown threads", () => {
  it("refetches once per thread id it has not asked about", async () => {
    const loadThreads = vi.fn(async () => THREADS);
    const source = createThreadTimesSource(loadThreads);
    await source.load();

    await source.refreshForUnknown(["new"]);
    await source.refreshForUnknown(["new"]);
    await source.refreshForUnknown(["new", "newer"]);

    expect(loadThreads).toHaveBeenCalledTimes(3);
  });
});
