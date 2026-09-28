import { beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { getBackend, setBackend } from "./backend";
import { UnreadableDataError } from "./errors";
import { createMemoryStorage } from "./memory-storage";
import {
  addUser,
  findUserByEmail,
  readUsers,
  USERS_KEY,
  type Credential,
} from "./users";

const credential: Credential = {
  algo: "PBKDF2-SHA256",
  iterations: 600000,
  salt: "AAAAAAAAAAAAAAAAAAAAAA==",
  hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

beforeEach(() => setBackend(createMemoryStorage()));

test("reads a missing registry as empty", () => {
  expect(readUsers()).toEqual({});
  expect(getBackend().length).toBe(0);
});

test("adds a User with a new UUID and finds them by email", () => {
  const user = addUser({
    fullName: "Ana López",
    email: "ana@example.com",
    credential,
  });
  expect(user).not.toBeNull();
  const { id } = user!;
  expect(z.uuid().safeParse(id).success).toBe(true);
  expect(findUserByEmail("ana@example.com")).toEqual(user);
  expect(JSON.parse(getBackend().getItem(USERS_KEY)!)).toEqual({
    [id]: { id, fullName: "Ana López", email: "ana@example.com", credential },
  });
});

test("refuses a second User with the same email", () => {
  addUser({ fullName: "Ana López", email: "ana@example.com", credential });
  expect(
    addUser({ fullName: "Ana B", email: "ana@example.com", credential }),
  ).toBeNull();
  expect(Object.keys(readUsers())).toHaveLength(1);
});

test("raises UnreadableDataError for an invalid registry", () => {
  for (const raw of ["not json", '{"x":{"id":1}}']) {
    getBackend().setItem(USERS_KEY, raw);
    expect(readUsers).toThrow(UnreadableDataError);
    try {
      readUsers();
    } catch (error) {
      expect((error as UnreadableDataError).key).toBe("snailrace.v1.users");
    }
  }
});
