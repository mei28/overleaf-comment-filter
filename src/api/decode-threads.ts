import {
  describeValue,
  expectArray,
  expectNumber,
  expectObject,
  expectString,
  ShapeError,
} from "./shape";

export type ApiUser = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type ApiMessage = {
  content: string;
  timestamp: number;
  // Overleaf omits `user` when the account no longer exists.
  user: ApiUser | undefined;
};

export type ApiThread = {
  messages: ApiMessage[];
  resolved: boolean;
};

export type ApiThreads = ReadonlyMap<string, ApiThread>;

// Decodes GET /project/{id}/threads. Only fields the list reads are checked.
export function decodeThreads(json: unknown): ApiThreads {
  const root = expectObject(json, "threads");
  const threads = new Map<string, ApiThread>();
  for (const [threadId, value] of Object.entries(root)) {
    threads.set(threadId, decodeThread(value, `threads.${threadId}`));
  }
  return threads;
}

function decodeThread(value: unknown, path: string): ApiThread {
  const thread = expectObject(value, path);
  const rawMessages = expectArray(thread.messages, `${path}.messages`);
  // Overleaf creates a thread together with its first message.
  if (rawMessages.length === 0) {
    throw new ShapeError(`${path}.messages`, "non-empty array", "empty array");
  }
  const messages = rawMessages.map((message, index) =>
    decodeMessage(message, `${path}.messages[${index}]`),
  );
  expectAscendingTimestamps(messages, `${path}.messages`);
  return { messages, resolved: decodeResolved(thread.resolved, path) };
}

// Overleaf sets `resolved: true` on resolve and deletes the key on reopen.
function decodeResolved(value: unknown, path: string): boolean {
  if (value === undefined) return false;
  if (value === true) return true;
  throw new ShapeError(
    `${path}.resolved`,
    "true or missing",
    describeValue(value),
  );
}

// The chat service sorts messages by timestamp, and the list relies on the
// first and last message being the oldest and newest.
function expectAscendingTimestamps(messages: ApiMessage[], path: string): void {
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    if (previous !== undefined && message.timestamp < previous.timestamp) {
      throw new ShapeError(
        `${path}[${index}].timestamp`,
        `not earlier than messages[${index - 1}]`,
        "earlier",
      );
    }
  });
}

function decodeMessage(value: unknown, path: string): ApiMessage {
  const message = expectObject(value, path);
  return {
    content: expectString(message.content, `${path}.content`),
    timestamp: expectNumber(message.timestamp, `${path}.timestamp`),
    user:
      message.user === undefined
        ? undefined
        : decodeUser(message.user, `${path}.user`),
  };
}

// Overleaf copies each name field only when it is non-empty.
function decodeUser(value: unknown, path: string): ApiUser {
  const raw = expectObject(value, path);
  const user: ApiUser = {};
  if (raw.first_name !== undefined) {
    user.firstName = expectString(raw.first_name, `${path}.first_name`);
  }
  if (raw.last_name !== undefined) {
    user.lastName = expectString(raw.last_name, `${path}.last_name`);
  }
  if (raw.email !== undefined) {
    user.email = expectString(raw.email, `${path}.email`);
  }
  return user;
}
