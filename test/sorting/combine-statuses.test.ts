import { expect, it } from "vitest";
import { combineStatuses } from "../../src/sorting/sorter-status";

const idle = { kind: "idle" } as const;
const loading = { kind: "loading" } as const;
const error = { kind: "error", message: "HTTP 403" } as const;

it.each([
  [[idle, idle], idle],
  [[idle, loading], loading],
  [[loading, error], error],
  [[error, idle], error],
] as const)("combines %j into %j", (statuses, expected) => {
  expect(combineStatuses([...statuses])).toEqual(expected);
});
