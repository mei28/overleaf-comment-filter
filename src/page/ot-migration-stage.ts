import { expectNumber, parseJson } from "../api/shape";

const META_NAME = "ol-otMigrationStage";

// Mirrors Overleaf's getMeta() for `data-type="number"`: a missing tag or an
// empty content attribute means no stage.
export function readOtMigrationStage(doc: Document): number | undefined {
  const meta = doc.head.querySelector<HTMLMetaElement>(
    `meta[name="${META_NAME}"]`,
  );
  if (meta === null || meta.content === "") return undefined;
  return expectNumber(parseJson(meta.content, META_NAME), META_NAME);
}

// At stage 1 Overleaf's own review panel builds comment ranges from the
// history snapshot instead of calling /ranges (use-project-ranges.ts).
export function assertSupportedOtMigrationStage(
  stage: number | undefined,
): void {
  if (stage !== 1) return;
  throw new Error(
    `This project is at Overleaf history migration stage ${stage}. Its comment positions are not available from /ranges, so this script does not support it yet.`,
  );
}
