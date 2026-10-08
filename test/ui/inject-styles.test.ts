// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { injectStyles } from "../../src/ui/inject-styles";

afterEach(() => {
  document.head.replaceChildren();
});

it("adds the script's stylesheet to the head once", () => {
  injectStyles(document);
  injectStyles(document);
  const styles = document.head.querySelectorAll("style#ocf-styles");
  expect(styles).toHaveLength(1);
  expect(styles[0]?.textContent).toContain(".ocf-sort-toggle");
});
