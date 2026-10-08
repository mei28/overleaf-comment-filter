import { OverleafUiError } from "./overleaf-ui-error";

type Fiber = { memoizedProps: unknown; return: Fiber | null };

const FIBER_KEY_PREFIX = "__reactFiber$";
const PURPOSE = "Overview comment entry";
// ReviewPanelComment sits 2 levels above the entry's host element today; a
// small bound keeps the walk from picking up an unrelated ancestor.
const MAX_LEVELS = 5;

// Overleaf's DOM carries no thread id, so read the props React keeps on the
// entry's fiber: ReviewPanelComment receives `comment` (a range whose op.t is
// the thread id). This is React internals, not an Overleaf API.
export function readCommentThreadId(entry: Element): string {
  let fiber = fiberOf(entry);
  for (let level = 0; level < MAX_LEVELS && fiber !== null; level += 1) {
    const thread = threadIdOf(fiber.memoizedProps);
    if (thread !== undefined) return thread;
    fiber = fiber.return;
  }
  throw new OverleafUiError(
    `${PURPOSE}: no comment props within ${MAX_LEVELS} React levels`,
  );
}

function fiberOf(entry: Element): Fiber | null {
  const key = Object.keys(entry).find((name) =>
    name.startsWith(FIBER_KEY_PREFIX),
  );
  if (key === undefined) {
    throw new OverleafUiError(
      `${PURPOSE}: React fiber not found (${FIBER_KEY_PREFIX}*)`,
    );
  }
  return (entry as unknown as Record<string, Fiber | null>)[key] ?? null;
}

function threadIdOf(props: unknown): string | undefined {
  const comment = (props as { comment?: { op?: { t?: unknown } } } | null)
    ?.comment;
  const threadId = comment?.op?.t;
  return typeof threadId === "string" ? threadId : undefined;
}
