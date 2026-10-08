// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSortMenu } from "../../src/header/sort-menu";

function setup() {
  const onSelect = vi.fn();
  const menu = createSortMenu(onSelect);
  const anchor = document.createElement("button");
  document.body.append(anchor, menu.element);
  const items = () => [
    ...menu.element.querySelectorAll<HTMLButtonElement>(".dropdown-item"),
  ];
  return { menu, anchor, onSelect, items };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createSortMenu", () => {
  it("opens under its button with every order and the current one checked", () => {
    const { menu, anchor, items } = setup();
    expect(menu.element.hidden).toBe(true);
    expect(menu.element.dataset.ocf).toBe("sort-menu");

    menu.update("latestReply", { kind: "idle" });
    menu.toggle(anchor);

    expect(menu.element.hidden).toBe(false);
    expect(menu.element.style.position).toBe("fixed");
    expect(anchor.getAttribute("aria-expanded")).toBe("true");
    expect(
      items().map((item) => [
        item.textContent,
        item.getAttribute("aria-checked"),
      ]),
    ).toEqual([
      ["Document order", "false"],
      ["checkLatest reply first", "true"],
      ["Oldest reply first", "false"],
      ["Newest comment first", "false"],
      ["Oldest comment first", "false"],
    ]);
  });
});

describe("createSortMenu interaction", () => {
  it("reports the chosen order and closes", () => {
    const { menu, anchor, onSelect, items } = setup();
    menu.update("document", { kind: "idle" });
    menu.toggle(anchor);

    items()[2]?.click();

    expect(onSelect).toHaveBeenCalledWith("oldestReply");
    expect(menu.element.hidden).toBe(true);
    expect(anchor.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on Escape and on a click outside, but not on a click inside", () => {
    const { menu, anchor } = setup();
    menu.update("document", { kind: "idle" });
    menu.toggle(anchor);

    menu.element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    expect(menu.element.hidden).toBe(false);
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true }),
    );
    expect(menu.element.hidden).toBe(true);

    menu.toggle(anchor);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(menu.element.hidden).toBe(true);
  });

  it("closes when its button leaves the page", () => {
    const { menu, anchor } = setup();
    menu.update("document", { kind: "idle" });
    menu.toggle(anchor);

    anchor.remove();
    menu.closeIfDetached();

    expect(menu.element.hidden).toBe(true);
  });
});

describe("createSortMenu status", () => {
  it.each([
    [{ kind: "idle" }, true, ""],
    [{ kind: "loading" }, false, "Loading comments…"],
    [
      { kind: "error", message: "HTTP 403" },
      false,
      "Sorting unavailable: HTTP 403",
    ],
  ] as const)("shows %j", (status, hidden, text) => {
    const { menu } = setup();
    menu.update("latestReply", status);
    const line = menu.element.querySelector(".ocf-sort-status") as HTMLElement;
    expect(line.hidden).toBe(hidden);
    expect(line.textContent).toBe(text);
  });
});
