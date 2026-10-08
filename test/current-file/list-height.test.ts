// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { currentFileListHeight } from "../../src/current-file/list-height";

type Win = Window & { overleaf?: unknown };

function withSize<E extends HTMLElement>(
  el: E,
  name: "clientHeight" | "offsetHeight",
  value: number,
): E {
  Object.defineProperty(el, name, { value });
  return el;
}

afterEach(() => {
  delete (window as Win).overleaf;
  document.body.replaceChildren();
});

describe("currentFileListHeight", () => {
  it("is the editor's visible height above the review panel's tab bar", () => {
    const scrollDOM = withSize(
      document.createElement("div"),
      "clientHeight",
      1198,
    );
    (window as Win).overleaf = {
      unstable: { store: { get: () => ({ scrollDOM }) } },
    };
    const footer = withSize(document.createElement("div"), "offsetHeight", 60);
    footer.id = "review-panel-tabs";
    footer.className = "review-panel-footer";
    document.body.append(footer);

    expect(currentFileListHeight(document, window)).toBe(1138);
  });

  it("names the missing tab bar", () => {
    const scrollDOM = document.createElement("div");
    (window as Win).overleaf = {
      unstable: { store: { get: () => ({ scrollDOM }) } },
    };
    expect(() => currentFileListHeight(document, window)).toThrowError(
      "Review panel tab bar: .review-panel-footer not found",
    );
  });
});
