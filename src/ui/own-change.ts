// Elements this script adds carry a data-ocf attribute, so observers can
// ignore the mutations the script causes itself.
const OWN_MARK = "[data-ocf]";

export function isOwnChange(record: MutationRecord): boolean {
  const nodes = [...record.addedNodes, ...record.removedNodes];
  const target = record.target as Element;
  return (
    target.closest?.(OWN_MARK) != null ||
    (nodes.length > 0 &&
      nodes.every((node) => (node as Element).matches?.(OWN_MARK)))
  );
}
