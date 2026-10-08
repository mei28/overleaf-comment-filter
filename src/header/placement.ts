export type Placement = { top: number; left: number; maxHeight: number };

const GAP = 4;
const MARGIN = 8;

export function popoverPlacement(
  anchor: { left: number; bottom: number },
  width: number,
  viewport: { width: number; height: number },
): Placement {
  const top = anchor.bottom + GAP;
  const left = Math.min(anchor.left, viewport.width - width - MARGIN);
  return { top, left, maxHeight: viewport.height - top - MARGIN };
}
