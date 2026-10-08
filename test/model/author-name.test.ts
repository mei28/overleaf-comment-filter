import { expect, it } from "vitest";
import { authorName } from "../../src/model/author-name";

it("joins first and last name", () => {
  expect(
    authorName({ firstName: "Alice", lastName: "Example", email: "a@x.org" }),
  ).toBe("Alice Example");
});

it("uses the first name alone when there is no last name", () => {
  expect(authorName({ firstName: "Bob", email: "bob@x.org" })).toBe("Bob");
});

it("uses the email local part when there are no names", () => {
  expect(authorName({ email: "carol@example.com" })).toBe("carol");
});

it("shows Unknown for a user without names or email", () => {
  expect(authorName({})).toBe("Unknown");
});

it("shows Deleted user when the account no longer exists", () => {
  expect(authorName(undefined)).toBe("Deleted user");
});
