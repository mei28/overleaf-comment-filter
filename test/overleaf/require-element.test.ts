// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { requireElement } from "../../src/overleaf/require-element";

describe("requireElement", () => {
  it("returns the first matching element", () => {
    const root = document.createElement("div");
    root.innerHTML = '<p class="a"></p><p class="a"></p>';
    expect(requireElement(root, ".a", "test")).toBe(root.firstElementChild);
  });

  it("names the purpose and selector when nothing matches", () => {
    const root = document.createElement("div");
    expect(() =>
      requireElement(
        root,
        ".review-panel-resolved-comments-toggle",
        "Review header",
      ),
    ).toThrowError(
      "Review header: .review-panel-resolved-comments-toggle not found",
    );
  });
});
