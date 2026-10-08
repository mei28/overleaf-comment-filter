import { describe, expect, it } from "vitest";
import { decodeThreads } from "../../src/api/decode-threads";
import sample from "../fixtures/threads.sample.json";

describe("decodeThreads", () => {
  it("decodes the fields the list needs and drops the rest", () => {
    expect(decodeThreads(sample)).toEqual(
      new Map([
        [
          "aaaaaaaaaaaaaaaaaaaa0001",
          {
            resolved: false,
            messages: [
              {
                content: "Could you cite the original paper here?",
                timestamp: 1700000000000,
                user: {
                  firstName: "Alice",
                  lastName: "Example",
                  email: "alice@example.com",
                },
              },
              {
                content: "Added the citation.",
                timestamp: 1700003600000,
                user: { firstName: "Bob", email: "bob@example.com" },
              },
            ],
          },
        ],
        [
          "aaaaaaaaaaaaaaaaaaaa0002",
          {
            resolved: false,
            messages: [
              {
                content: "Typo in this sentence.",
                timestamp: 1700100000000,
                user: undefined,
              },
            ],
          },
        ],
        [
          "aaaaaaaaaaaaaaaaaaaa0003",
          {
            resolved: true,
            messages: [
              {
                content: "Fixed already.",
                timestamp: 1700200000000,
                user: {
                  firstName: "Alice",
                  lastName: "Example",
                  email: "alice@example.com",
                },
              },
            ],
          },
        ],
      ]),
    );
  });
});

const T1 = "aaaaaaaaaaaaaaaaaaaa0001";

type RawThreads = Record<string, Record<string, unknown>>;
type RawMessage = Record<string, unknown>;

// A deep copy of the sample that a test can break in one place.
function sampleCopy(): RawThreads {
  return structuredClone(sample) as RawThreads;
}

function sampleWithMessages(
  edit: (messages: RawMessage[]) => RawMessage[],
): RawThreads {
  const json = sampleCopy();
  const messages = json[T1]?.messages as RawMessage[];
  json[T1] = { ...json[T1], messages: edit(messages) };
  return json;
}

describe("decodeThreads errors", () => {
  it("rejects a thread without messages", () => {
    const json = sampleWithMessages(() => []);
    expect(() => decodeThreads(json)).toThrowError(
      `threads.${T1}.messages: expected non-empty array, got empty array`,
    );
  });

  it("rejects messages that are not in ascending timestamp order", () => {
    const json = sampleWithMessages((messages) => messages.toReversed());
    expect(() => decodeThreads(json)).toThrowError(
      `threads.${T1}.messages[1].timestamp: expected not earlier than messages[0], got earlier`,
    );
  });

  it("rejects a resolved flag other than true", () => {
    const json = sampleCopy();
    json[T1] = { ...json[T1], resolved: false };
    expect(() => decodeThreads(json)).toThrowError(
      `threads.${T1}.resolved: expected true or missing, got false`,
    );
  });

  it("rejects a root that is not an object", () => {
    expect(() => decodeThreads([])).toThrowError(
      "threads: expected object, got array",
    );
  });

  it.each([
    ["timestamp", "1700000000000", "expected number, got string"],
    ["content", undefined, "expected string, got missing"],
    ["user", null, "expected object, got null"],
  ])("rejects a bad message %s", (key, value, message) => {
    const json = sampleWithMessages(([first, ...rest]) => [
      { ...first, [key]: value },
      ...rest,
    ]);
    expect(() => decodeThreads(json)).toThrowError(
      `threads.${T1}.messages[0].${key}: ${message}`,
    );
  });

  it("rejects a user name that is not a string", () => {
    const json = sampleWithMessages(([first, ...rest]) => [
      { ...first, user: { first_name: 1 } },
      ...rest,
    ]);
    expect(() => decodeThreads(json)).toThrowError(
      `threads.${T1}.messages[0].user.first_name: expected string, got number`,
    );
  });
});
