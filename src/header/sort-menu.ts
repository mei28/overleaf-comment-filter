import {
  PRESET_LABELS,
  type SortPreset,
  TIME_PRESETS,
} from "../model/sort-presets";
import { MATERIAL_SYMBOL_CLASSES } from "../overleaf/selectors";
import type { SorterStatus } from "../sorting/sorter-status";
import { element } from "../ui/element";
import { popoverPlacement } from "./placement";

export type SortMenu = {
  // The menu; the caller appends it to the page.
  element: HTMLElement;
  update(preset: SortPreset, status: SorterStatus): void;
  toggle(anchor: HTMLElement): void;
  // Closes the menu once its button is gone, e.g. the Review panel closed.
  closeIfDetached(): void;
};

const PRESETS: readonly SortPreset[] = ["document", ...TIME_PRESETS];
const WIDTH = 220;

// A Bootstrap dropdown menu, so Overleaf's own CSS draws it like its menus.
export function createSortMenu(
  onSelect: (preset: SortPreset) => void,
): SortMenu {
  const items = new Map(
    PRESETS.map((preset) => {
      const item = element("button", "dropdown-item ocf-sort-item");
      item.type = "button";
      item.setAttribute("role", "menuitemradio");
      item.addEventListener("click", () => {
        close();
        onSelect(preset);
      });
      return [preset, item] as const;
    }),
  );
  const statusLine = element("li", "ocf-sort-status");
  statusLine.setAttribute("role", "status");
  statusLine.hidden = true;
  const menu = element(
    "ul",
    "dropdown-menu show ocf-sort-menu",
    ...[...items.values()].map((item) => element("li", "", item)),
    statusLine,
  );
  menu.dataset.ocf = "sort-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  let anchor: HTMLElement | undefined;

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node;
    if (menu.contains(target) || anchor?.contains(target)) return;
    close();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };

  const open = (button: HTMLElement) => {
    anchor = button;
    const placement = popoverPlacement(button.getBoundingClientRect(), WIDTH, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    Object.assign(menu.style, {
      position: "fixed",
      top: `${placement.top}px`,
      left: `${placement.left}px`,
      width: `${WIDTH}px`,
    });
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
  };

  // A function declaration, so the item click handlers above can call it.
  function close() {
    menu.hidden = true;
    anchor?.setAttribute("aria-expanded", "false");
    anchor = undefined;
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown);
  }

  return {
    element: menu,
    update(preset, status) {
      statusLine.hidden = status.kind === "idle";
      statusLine.textContent = statusText(status);
      for (const [itemPreset, item] of items) {
        const checked = itemPreset === preset;
        item.setAttribute("aria-checked", String(checked));
        item.replaceChildren(
          ...(checked ? [checkIcon()] : []),
          PRESET_LABELS[itemPreset],
        );
      }
    },
    toggle(button) {
      if (anchor === undefined) open(button);
      else close();
    },
    closeIfDetached() {
      if (anchor !== undefined && !anchor.isConnected) close();
    },
  };
}

function checkIcon(): HTMLElement {
  const icon = element(
    "span",
    [...MATERIAL_SYMBOL_CLASSES, "ocf-sort-check"].join(" "),
    "check",
  );
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function statusText(status: SorterStatus): string {
  switch (status.kind) {
    case "idle":
      return "";
    case "loading":
      return "Loading comments…";
    case "error":
      return `Sorting unavailable: ${status.message}`;
  }
}
