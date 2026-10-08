import { describe, expect, it } from "vitest";
import {
  describeValue,
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  ShapeError,
} from "../../src/api/shape";

describe("describeValue", () => {
  it.each([
    [undefined, "missing"],
    [null, "null"],
    [[], "array"],
    [true, "true"],
    [false, "false"],
    ["text", "string"],
    [1, "number"],
    [{}, "object"],
  ])("describes %j as %s", (value, expected) => {
    expect(describeValue(value)).toBe(expected);
  });
});

describe("expectObject", () => {
  it("returns a plain object unchanged", () => {
    const value = { a: 1 };
    expect(expectObject(value, "threads")).toBe(value);
  });

  it.each([
    [[], "array"],
    [null, "null"],
    [undefined, "missing"],
  ])("throws a ShapeError naming the path for %j", (value, actual) => {
    expect(() => expectObject(value, "threads.abc")).toThrowError(
      new ShapeError("threads.abc", "object", actual),
    );
    expect(() => expectObject(value, "threads.abc")).toThrowError(
      `threads.abc: expected object, got ${actual}`,
    );
  });
});

describe("expectArray / expectString / expectNumber", () => {
  it.each([
    ["expectArray", expectArray, [1]],
    ["expectString", expectString, "text"],
    ["expectNumber", expectNumber, 1700000000000],
  ] as const)("%s returns a matching value unchanged", (_, check, value) => {
    expect(check(value, "p")).toBe(value);
  });

  it.each([
    ["expectArray", expectArray, {}, "p: expected array, got object"],
    ["expectString", expectString, 1, "p: expected string, got number"],
    ["expectNumber", expectNumber, "1", "p: expected number, got string"],
    [
      "expectNumber",
      expectNumber,
      undefined,
      "p: expected number, got missing",
    ],
  ] as const)(
    "%s throws for a mismatching value",
    (_, check, value, message) => {
      expect(() => check(value, "p")).toThrowError(message);
    },
  );
});
