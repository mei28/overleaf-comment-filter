import css from "./styles.css?inline";

const STYLE_ID = "ocf-styles";

// Imported as a string and inserted here, so the userscript keeps
// `@grant none` (vite-plugin-monkey would otherwise need GM_addStyle).
export function injectStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID) !== null) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  doc.head.append(style);
}
