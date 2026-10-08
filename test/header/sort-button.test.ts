// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureSortButton, showSortState } from "../../src/header/sort-button";

// The Review panel header as Overleaf renders it.
function mountReviewHeader(): HTMLElement {
  const header = document.createElement("div");
  header.className = "review-panel-header";
  header.innerHTML = `
    <div class="rail-panel-header">
      <h4 class="rail-panel-title">Review</h4>
      <div class="rail-panel-header-actions">
        <button class="review-panel-resolved-comments-toggle"><span class="material-symbols">inbox</span></button>
        <button class="d-inline-grid rail-panel-header-button-subdued icon-button-small btn"><span class="material-symbols icon-small">close</span></button>
      </div>
    </div>`;
  document.body.append(header);
  return header;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("ensureSortButton", () => {
  it("adds a sort icon button before Resolved comments that reports clicks", () => {
    const header = mountReviewHeader();
    const onClick = vi.fn();

    const button = ensureSortButton(document, onClick);

    const actions = header.querySelector(".rail-panel-header-actions");
    expect(actions?.firstElementChild).toBe(button);
    expect(button?.className).toBe(
      "d-inline-grid rail-panel-header-button-subdued icon-button-small btn ocf-sort-toggle",
    );
    expect(button?.getAttribute("aria-label")).toBe("Sort comments");
    expect(button?.querySelector(".material-symbols")?.textContent).toBe(
      "sort",
    );
    button?.click();
    expect(onClick).toHaveBeenCalledWith(button);
  });

  it("adds the button only once", () => {
    mountReviewHeader();
    const first = ensureSortButton(document, () => {});
    const second = ensureSortButton(document, () => {});
    expect(second).toBe(first);
    expect(document.querySelectorAll(".ocf-sort-toggle")).toHaveLength(1);
  });

  it("does nothing while the Review panel is closed", () => {
    expect(ensureSortButton(document, () => {})).toBeUndefined();
  });
});

describe("showSortState", () => {
  it.each([
    ["document", { kind: "idle" }, "false", undefined, "Sort comments"],
    ["latestReply", { kind: "idle" }, "true", undefined, "Sort comments"],
    ["latestReply", { kind: "loading" }, "true", "loading", "Sort comments"],
    [
      "latestReply",
      { kind: "error", message: "HTTP 403" },
      "true",
      "error",
      "Sorting unavailable: HTTP 403",
    ],
  ] as const)("marks %s with %j", (preset, status, pressed, state, title) => {
    mountReviewHeader();
    const button = ensureSortButton(document, () => {}) as HTMLButtonElement;
    showSortState(button, preset, status);
    expect(button.getAttribute("aria-pressed")).toBe(pressed);
    expect(button.dataset.ocfState).toBe(state);
    expect(button.title).toBe(title);
  });
});
