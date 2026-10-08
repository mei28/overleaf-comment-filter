// Strings are appended as text nodes, never parsed as HTML: comment text is
// untrusted input.
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.append(...children);
  return node;
}
