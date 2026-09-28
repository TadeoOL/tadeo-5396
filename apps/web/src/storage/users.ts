import { z } from "zod";
import { getBackend } from "./backend";
import { UnreadableDataError } from "./errors";
import { notify } from "./subscribe";

export const USERS_KEY = "snailrace.v1.users";

const CredentialSchema = z.object({
  algo: z.literal("PBKDF2-SHA256"),
  iterations: z.int().positive(),
  salt: z.base64(),
  hash: z.base64(),
});

const UserSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.string(),
  credential: CredentialSchema,
});

const UsersSchema = z.record(z.uuid(), UserSchema);

export type Credential = z.infer<typeof CredentialSchema>;
export type User = z.infer<typeof UserSchema>;

const EMPTY: Readonly<Record<string, User>> = Object.freeze({});
let cache: { raw: string; users: Readonly<Record<string, User>> } | undefined;

export function readUsers(): Readonly<Record<string, User>> {
  const raw = getBackend().getItem(USERS_KEY);
  if (raw === null) return EMPTY;
  if (cache?.raw === raw) return cache.users;
  let users: Record<string, User>;
  try {
    users = UsersSchema.parse(JSON.parse(raw));
  } catch {
    throw new UnreadableDataError(USERS_KEY);
  }
  cache = { raw, users };
  return users;
}

export function findUserByEmail(email: string): User | undefined {
  return Object.values(readUsers()).find((user) => user.email === email);
}

export function addUser(input: Omit<User, "id">): User | null {
  const users = readUsers();
  if (Object.values(users).some((user) => user.email === input.email)) {
    return null;
  }
  const user: User = { id: crypto.randomUUID(), ...input };
  getBackend().setItem(
    USERS_KEY,
    JSON.stringify({ ...users, [user.id]: user }),
  );
  notify();
  return user;
}
