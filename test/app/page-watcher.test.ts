// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { watchPage } from "../../src/app/page-watcher";

let stop: () => void = () => {};

afterEach(() => {
  stop();
  document.body.replaceChildren();
});

it("reports page changes but not the script's own elements", async () => {
  const onChange = vi.fn();
  stop = watchPage(document, onChange);

  const own = document.createElement("div");
  own.dataset.ocf = "timeline";
  document.body.append(own);
  own.append(document.createElement("p"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(onChange).not.toHaveBeenCalled();

  document.body.append(document.createElement("section"));
  await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
});
