import css from "./panel.css?inline";

const HOST_ID = "overleaf-comment-filter";

// The shadow root keeps Overleaf's styles out of the panel and ours out of
// Overleaf.
export function mountShadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);
  return root;
}
