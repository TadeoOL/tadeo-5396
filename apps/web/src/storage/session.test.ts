import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { getBackend, setBackend } from "./backend";
import { UnreadableDataError } from "./errors";
import { createMemoryStorage } from "./memory-storage";
import { endSession, readSession, SESSION_KEY, startSession } from "./session";
import { subscribe } from "./subscribe";
import { addUser, USERS_KEY, type User } from "./users";

let user: User;

beforeEach(() => {
  setBackend(createMemoryStorage());
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-28T12:00:00.000Z"));
  user = addUser({
    fullName: "Ana López",
    email: "ana@example.com",
    credential: {
      algo: "PBKDF2-SHA256",
      iterations: 600000,
      salt: "AAAAAAAAAAAAAAAAAAAAAA==",
      hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    },
  })!;
});

afterEach(() => vi.useRealTimers());

type SessionRecord = { id: string; expiresAt: string };
const stored = () =>
  JSON.parse(getBackend().getItem(SESSION_KEY)!) as SessionRecord;

test("starts a 24 h Session for the User", () => {
  startSession(user.id);
  const record = stored();
  expect(z.uuid().safeParse(record.id).success).toBe(true);
  expect(record).toEqual({
    id: record.id,
    userId: user.id,
    issuedAt: "2026-09-28T12:00:00.000Z",
    expiresAt: "2026-09-29T12:00:00.000Z",
  });
  expect(readSession()).toEqual({
    status: "signed-in",
    sessionId: record.id,
    user,
    expiresAt: "2026-09-29T12:00:00.000Z",
  });
});

test("expires at 24 h", () => {
  startSession(user.id);
  vi.setSystemTime(new Date("2026-09-29T11:59:59.999Z"));
  expect(readSession().status).toBe("signed-in");
  vi.setSystemTime(new Date("2026-09-29T12:00:00.000Z"));
  expect(readSession()).toEqual({ status: "signed-out", expired: true });
});

test("treats a Session whose User is missing as signed out", () => {
  startSession("9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d");
  expect(readSession()).toEqual({ status: "signed-out", expired: false });
});

test("treats a malformed Session as signed out without writing", () => {
  startSession(user.id);
  const bad = { ...stored(), expiresAt: "tomorrow" };
  for (const raw of ["not json", '{"id":"x"}', JSON.stringify(bad)]) {
    getBackend().setItem(SESSION_KEY, raw);
    expect(readSession()).toEqual({ status: "signed-out", expired: false });
    expect(getBackend().getItem(SESSION_KEY)).toBe(raw);
  }
});

test("raises UnreadableDataError when the Users registry is invalid", () => {
  startSession(user.id);
  getBackend().setItem(USERS_KEY, "not json");
  expect(readSession).toThrow(UnreadableDataError);
});

test("returns the same state object while nothing changed", () => {
  startSession(user.id);
  const first = readSession();
  expect(readSession()).toBe(first);
  startSession(user.id);
  expect(readSession()).not.toBe(first);
});

test("a new sign-in replaces the Session id", () => {
  startSession(user.id);
  const first = readSession();
  startSession(user.id);
  const second = readSession();
  expect(first.status === "signed-in" && first.sessionId).not.toBe(
    second.status === "signed-in" && second.sessionId,
  );
});

test("endSession removes the Session and notifies subscribers", () => {
  startSession(user.id);
  const listener = vi.fn();
  const unsubscribe = subscribe(listener);
  endSession();
  expect(getBackend().getItem(SESSION_KEY)).toBeNull();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(readSession()).toEqual({ status: "signed-out", expired: false });
  unsubscribe();
});
