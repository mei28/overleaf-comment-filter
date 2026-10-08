import { OverleafUiError } from "./overleaf-ui-error";

export function requireElement<E extends Element = Element>(
  root: ParentNode,
  selector: string,
  purpose: string,
): E {
  const found = root.querySelector<E>(selector);
  if (found === null) {
    throw new OverleafUiError(`${purpose}: ${selector} not found`);
  }
  return found;
}
