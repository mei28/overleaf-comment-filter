// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import {
  assertSupportedOtMigrationStage,
  readOtMigrationStage,
} from "../../src/page/ot-migration-stage";

function setMeta(content: string | undefined): void {
  const meta = document.createElement("meta");
  meta.name = "ol-otMigrationStage";
  meta.dataset.type = "number";
  if (content !== undefined) meta.content = content;
  document.head.append(meta);
}

afterEach(() => {
  document.head.replaceChildren();
});

describe("readOtMigrationStage", () => {
  it("returns undefined when the page has no stage meta tag", () => {
    expect(readOtMigrationStage(document)).toBeUndefined();
  });

  it("parses the stage number", () => {
    setMeta("12");
    expect(readOtMigrationStage(document)).toBe(12);
  });

  it("returns undefined for an empty content attribute", () => {
    setMeta(undefined);
    expect(readOtMigrationStage(document)).toBeUndefined();
  });

  it("rejects a value that is not a number", () => {
    setMeta('"12"');
    expect(() => readOtMigrationStage(document)).toThrowError(
      "ol-otMigrationStage: expected number, got string",
    );
  });

  it("rejects content that is not JSON, naming the meta tag", () => {
    setMeta("x");
    expect(() => readOtMigrationStage(document)).toThrowError(
      "ol-otMigrationStage: expected JSON, got unparsable text",
    );
  });
});

describe("assertSupportedOtMigrationStage", () => {
  it("rejects stage 1, where Overleaf stops serving comment ranges from /ranges", () => {
    expect(() => assertSupportedOtMigrationStage(1)).toThrowError(
      "This project is at Overleaf history migration stage 1. Its comment positions are not available from /ranges, so this script does not support it yet.",
    );
  });

  it.each([undefined, 0, 12])("accepts stage %s", (stage) => {
    expect(() => assertSupportedOtMigrationStage(stage)).not.toThrow();
  });
});
