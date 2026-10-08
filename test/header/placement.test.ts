import { describe, expect, it } from "vitest";
import { popoverPlacement } from "../../src/header/placement";

const VIEWPORT = { width: 1200, height: 800 };

describe("popoverPlacement", () => {
  it("opens just below the button, aligned to its left edge", () => {
    expect(popoverPlacement({ left: 100, bottom: 60 }, 320, VIEWPORT)).toEqual({
      top: 64,
      left: 100,
      maxHeight: 728,
    });
  });
});

describe("popoverPlacement near the right edge", () => {
  it("shifts left so the popover stays inside the viewport", () => {
    expect(
      popoverPlacement({ left: 1000, bottom: 60 }, 320, VIEWPORT).left,
    ).toBe(872);
  });
});
