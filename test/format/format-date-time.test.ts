import { expect, it } from "vitest";
import { formatDateTime } from "../../src/format/format-date-time";

// vitest.config.ts sets TZ=UTC, so local time equals UTC here.
it("formats an epoch timestamp as local date and minute", () => {
  expect(formatDateTime(Date.UTC(2023, 10, 14, 22, 13, 20))).toBe(
    "2023-11-14 22:13",
  );
});

it("zero-pads single-digit fields", () => {
  expect(formatDateTime(Date.UTC(2024, 0, 2, 3, 4, 5))).toBe(
    "2024-01-02 03:04",
  );
});
