import type { SortPreset } from "../model/sort-presets";
import {
  HEADER_ICON_BUTTON_CLASSES,
  MATERIAL_SYMBOL_CLASSES,
  SELECTORS,
} from "../overleaf/selectors";
import type { SorterStatus } from "../sorting/sorter-status";
import { element } from "../ui/element";

const LABEL = "Sort comments";

// Puts an icon button into the Review panel header, styled like the
// header's own buttons. Returns undefined while the Review panel is closed.
export function ensureSortButton(
  doc: Document,
  onClick: (button: HTMLButtonElement) => void,
): HTMLButtonElement | undefined {
  const actions = doc.querySelector(SELECTORS.reviewHeaderActions);
  if (actions === null) return undefined;
  const existing = actions.querySelector<HTMLButtonElement>(
    "[data-ocf='sort-button']",
  );
  if (existing !== null) return existing;
  const button = element(
    "button",
    [...HEADER_ICON_BUTTON_CLASSES, "ocf-sort-toggle"].join(" "),
    iconElement("sort"),
  );
  button.type = "button";
  button.dataset.ocf = "sort-button";
  button.setAttribute("aria-label", LABEL);
  button.setAttribute("aria-pressed", "false");
  button.title = LABEL;
  button.addEventListener("click", () => onClick(button));
  actions.prepend(button);
  return button;
}

// Pressed while a time order is active; styles.css highlights it and marks
// loading and error states.
export function showSortState(
  button: HTMLButtonElement,
  preset: SortPreset,
  status: SorterStatus,
): void {
  button.setAttribute("aria-pressed", String(preset !== "document"));
  if (status.kind === "idle") delete button.dataset.ocfState;
  else button.dataset.ocfState = status.kind;
  button.title =
    status.kind === "error" ? `Sorting unavailable: ${status.message}` : LABEL;
}

function iconElement(name: string): HTMLElement {
  const icon = element("span", MATERIAL_SYMBOL_CLASSES.join(" "), name);
  icon.setAttribute("aria-hidden", "true");
  return icon;
}
