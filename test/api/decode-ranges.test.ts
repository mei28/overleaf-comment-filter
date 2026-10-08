import { describe, expect, it } from "vitest";
import { decodeRanges } from "../../src/api/decode-ranges";
import sample from "../fixtures/ranges.sample.json";

describe("decodeRanges", () => {
  it("decodes comment anchors per doc and ignores tracked changes", () => {
    expect(decodeRanges(sample)).toEqual([
      {
        docId: "dddddddddddddddddddd0001",
        comments: [
          {
            threadId: "aaaaaaaaaaaaaaaaaaaa0001",
            highlightedText: "as shown in prior work",
          },
          { threadId: "aaaaaaaaaaaaaaaaaaaa0003", highlightedText: "teh" },
        ],
      },
      {
        docId: "dddddddddddddddddddd0002",
        comments: [
          {
            threadId: "aaaaaaaaaaaaaaaaaaaa0002",
            highlightedText: "This sentense has a typo.",
          },
        ],
      },
      { docId: "dddddddddddddddddddd0003", comments: [] },
    ]);
  });
});

type RawDoc = { id: unknown; ranges?: unknown };

// A deep copy of the sample with the first doc replaced.
function sampleWithFirstDoc(edit: (doc: RawDoc) => RawDoc): unknown {
  const [first, ...rest] = structuredClone(sample) as RawDoc[];
  return [edit(first as RawDoc), ...rest];
}

describe("decodeRanges errors", () => {
  it("rejects a root that is not an array", () => {
    expect(() => decodeRanges({})).toThrowError(
      "ranges: expected array, got object",
    );
  });

  it.each([
    [
      "missing ranges",
      (doc: RawDoc): RawDoc => ({ id: doc.id }),
      "ranges[0].ranges: expected object, got missing",
    ],
    [
      "comments that are not an array",
      (doc: RawDoc): RawDoc => ({ ...doc, ranges: { comments: {} } }),
      "ranges[0].ranges.comments: expected array, got object",
    ],
    [
      "a thread id that is not a string",
      (doc: RawDoc): RawDoc => ({
        ...doc,
        ranges: { comments: [{ op: { c: "x", p: 1, t: 1 } }] },
      }),
      "ranges[0].ranges.comments[0].op.t: expected string, got number",
    ],
    [
      "missing highlighted text",
      (doc: RawDoc): RawDoc => ({
        ...doc,
        ranges: { comments: [{ op: { p: 1, t: "x" } }] },
      }),
      "ranges[0].ranges.comments[0].op.c: expected string, got missing",
    ],
  ])("rejects %s", (_, edit, message) => {
    expect(() => decodeRanges(sampleWithFirstDoc(edit))).toThrowError(message);
  });
});
