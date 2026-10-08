import { expect, it } from "vitest";
import { commentDeepLink } from "../../src/links/comment-deep-link";

it("builds Overleaf's deep link to a comment thread in a doc", () => {
  expect(
    commentDeepLink(
      "0123456789abcdef01234567",
      "89abcdef0123456789abcdef",
      "fedcba9876543210fedcba98",
    ),
  ).toBe(
    "/project/0123456789abcdef01234567?doc=89abcdef0123456789abcdef&comment=fedcba9876543210fedcba98",
  );
});
