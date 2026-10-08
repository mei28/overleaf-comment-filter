// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { showScanOverlay } from "../../src/current-file/scan-overlay";

afterEach(() => {
  document.body.replaceChildren();
});

function keydown(): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key: "a",
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(event);
  return event;
}

describe("showScanOverlay", () => {
  it("covers the editor and says what is happening", () => {
    const area = document.createElement("div");
    document.body.append(area);

    const overlay = showScanOverlay(document, area);
    overlay.update(3, 7);

    const el = document.querySelector<HTMLElement>("[data-ocf='scan-overlay']");
    expect(el?.style.position).toBe("fixed");
    expect(el?.getAttribute("role")).toBe("status");
    expect(el?.textContent).toContain("Collecting comments to sort…");
    expect(el?.textContent).toContain("Please don't scroll or type");
    expect(el?.querySelector(".ocf-scan-progress")?.textContent).toBe(
      "Step 3 of 7",
    );
    overlay.remove();
  });

  it("holds keyboard input and focus until it is removed", () => {
    const area = document.createElement("div");
    const editor = document.createElement("input");
    document.body.append(area, editor);
    editor.focus();

    const overlay = showScanOverlay(document, area);
    expect(document.activeElement).not.toBe(editor);
    expect(keydown().defaultPrevented).toBe(true);

    overlay.remove();
    expect(document.querySelector("[data-ocf='scan-overlay']")).toBeNull();
    expect(document.activeElement).toBe(editor);
    expect(keydown().defaultPrevented).toBe(false);
  });
});
