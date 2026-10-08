import { element } from "./element";

export type PanelElements = {
  toggle: HTMLButtonElement;
  panel: HTMLElement;
  title: HTMLElement;
  close: HTMLButtonElement;
  sortKey: HTMLSelectElement;
  order: HTMLButtonElement;
  reload: HTMLButtonElement;
  body: HTMLElement;
};

// Static markup only; behaviour is wired by the controller.
export function createPanel(root: ShadowRoot): PanelElements {
  const toggle = button("toggle", "Comments");
  toggle.setAttribute("aria-expanded", "false");
  const title = element("h2", "panel-title", "Unresolved comments");
  const close = button("close", "×");
  close.setAttribute("aria-label", "Close");
  const sortKey = element(
    "select",
    "sort-key",
    option("lastActivity", "Last activity"),
    option("created", "Created"),
  );
  sortKey.setAttribute("aria-label", "Sort by");
  const order = button("order", "Newest first");
  const reload = button("reload", "Reload");
  const body = element("div", "body");
  const panel = element(
    "section",
    "panel",
    element("header", "panel-header", title, close),
    element("div", "controls", sortKey, order, reload),
    body,
  );
  panel.hidden = true;
  root.append(toggle, panel);
  return { toggle, panel, title, close, sortKey, order, reload, body };
}

function button(className: string, label: string): HTMLButtonElement {
  const node = element("button", className, label);
  node.type = "button";
  return node;
}

function option(value: string, label: string): HTMLOptionElement {
  const node = element("option", "", label);
  node.value = value;
  return node;
}
