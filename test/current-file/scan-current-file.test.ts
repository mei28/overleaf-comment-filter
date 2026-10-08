// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { scanCurrentFile } from "../../src/current-file/scan-current-file";

type Win = Window & { overleaf?: unknown };

function exposeView(dispatch: () => void): void {
  const scrollDOM = document.createElement("div");
  Object.defineProperty(scrollDOM, "scrollHeight", { value: 1000 });
  Object.defineProperty(scrollDOM, "clientHeight", { value: 500 });
  (window as Win).overleaf = {
    unstable: {
      store: {
        get: () => ({
          dom: document.createElement("div"),
          scrollDOM,
          scrollSnapshot: () => "snapshot",
          dispatch,
        }),
      },
    },
  };
}

const overlay = () => document.querySelector("[data-ocf='scan-overlay']");

afterEach(() => {
  delete (window as Win).overleaf;
  document.body.replaceChildren();
});

describe("scanCurrentFile", () => {
  it("shows the overlay while scanning and removes it afterwards", async () => {
    const seen: boolean[] = [];
    exposeView(() => {});

    await scanCurrentFile(document, window, async () => {
      seen.push(overlay() !== null);
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
    expect(overlay()).toBeNull();
  });

  it("removes the overlay when the scan fails", async () => {
    exposeView(() => {
      throw new Error("restore failed");
    });

    await expect(
      scanCurrentFile(document, window, async () => {}),
    ).rejects.toThrowError("restore failed");
    expect(overlay()).toBeNull();
  });
});
