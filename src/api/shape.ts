// Describes a value by its kind only, so errors never echo comment text or
// emails into a bug report.
export function describeValue(value: unknown): string {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "boolean") return String(value);
  return typeof value;
}

export class ShapeError extends Error {
  constructor(
    path: string,
    expected: string,
    actual: string,
    options?: ErrorOptions,
  ) {
    super(`${path}: expected ${expected}, got ${actual}`, options);
    this.name = "ShapeError";
  }
}

export function expectObject(
  value: unknown,
  path: string,
): Record<string, unknown> {
  const actual = describeValue(value);
  if (actual !== "object") throw new ShapeError(path, "object", actual);
  return value as Record<string, unknown>;
}

export function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ShapeError(path, "array", describeValue(value));
  }
  return value;
}

export function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new ShapeError(path, "string", describeValue(value));
  }
  return value;
}

export function expectNumber(value: unknown, path: string): number {
  if (typeof value !== "number") {
    throw new ShapeError(path, "number", describeValue(value));
  }
  return value;
}

export function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ShapeError(path, "JSON", "unparsable text", { cause });
  }
}
