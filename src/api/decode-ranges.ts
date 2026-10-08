import { expectArray, expectObject, expectString } from "./shape";

export type ApiRangeComment = {
  threadId: string;
  highlightedText: string;
};

export type ApiDocRanges = {
  docId: string;
  comments: ApiRangeComment[];
};

// Decodes GET /project/{id}/ranges. Tracked changes are not read.
export function decodeRanges(json: unknown): ApiDocRanges[] {
  return expectArray(json, "ranges").map((doc, index) =>
    decodeDocRanges(doc, `ranges[${index}]`),
  );
}

function decodeDocRanges(value: unknown, path: string): ApiDocRanges {
  const doc = expectObject(value, path);
  const ranges = expectObject(doc.ranges, `${path}.ranges`);
  // Overleaf omits `comments` for a doc without comments.
  const comments =
    ranges.comments === undefined
      ? []
      : expectArray(ranges.comments, `${path}.ranges.comments`).map(
          (comment, index) =>
            decodeComment(comment, `${path}.ranges.comments[${index}]`),
        );
  return { docId: expectString(doc.id, `${path}.id`), comments };
}

function decodeComment(value: unknown, path: string): ApiRangeComment {
  const op = expectObject(expectObject(value, path).op, `${path}.op`);
  return {
    threadId: expectString(op.t, `${path}.op.t`),
    highlightedText: expectString(op.c, `${path}.op.c`),
  };
}
