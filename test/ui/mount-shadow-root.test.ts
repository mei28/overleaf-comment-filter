// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { mountShadowRoot } from "../../src/ui/mount-shadow-root";

afterEach(() => {
  document.body.replaceChildren();
});

it("mounts an open shadow root with the panel styles on the body", () => {
  const root = mountShadowRoot();
  const host = document.body.querySelector("#overleaf-comment-filter");
  expect(host?.shadowRoot).toBe(root);
  expect(root.querySelector("style")?.textContent).toContain(".panel");
});
