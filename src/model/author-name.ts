import type { ApiUser } from "../api/decode-threads";

// Overleaf's display rule: review-panel-entry-user.tsx shows "Deleted user"
// for a missing user, otherwise buildName() from shared/utils/build-name.ts.
export function authorName(user: ApiUser | undefined): string {
  if (user === undefined) return "Deleted user";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (name) return name;
  if (user.email) return user.email.split("@")[0] as string;
  return "Unknown";
}
