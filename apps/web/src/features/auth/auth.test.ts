import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getBackend, setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { endSession, readSession } from "@/storage/session";
import { THROTTLE_KEY } from "@/storage/throttle";
import { readUsers, USERS_KEY } from "@/storage/users";
import { signIn, signUp } from "./auth";
import { signInSchema, signUpSchema } from "./schemas";

beforeEach(() => setBackend(createMemoryStorage()));

const values = () =>
  signUpSchema.parse({
    fullName: "Ana López",
    email: "ana@example.com",
    password: "correct horse battery staple",
    confirmPassword: "correct horse battery staple",
  });

test("signs a new User in and writes no ledger", async () => {
  expect(await signUp(values())).toBe("signed-up");
  const session = readSession();
  expect(session.status === "signed-in" && session.user.fullName).toBe(
    "Ana López",
  );
  const backend = getBackend();
  const keys = Array.from({ length: backend.length }, (_, i) => backend.key(i));
  expect(keys.some((key) => key?.startsWith("snailrace.v1.ledger."))).toBe(
    false,
  );
  expect(backend.getItem(USERS_KEY)).not.toContain(
    "correct horse battery staple",
  );
});

test("rejects a duplicate email even when the check runs after the async hash", async () => {
  const results = await Promise.all([signUp(values()), signUp(values())]);
  expect(results.sort()).toEqual(["duplicate-email", "signed-up"]);
  expect(Object.keys(readUsers())).toHaveLength(1);
});

describe("signIn", () => {
  beforeEach(async () => {
    await signUp(values());
    endSession();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-28T12:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  const attempt = (email: string, password: string) =>
    signIn(signInSchema.parse({ email, password }));
  const RIGHT = "correct horse battery staple";
  const WRONG = "wrong horse battery staple";

  test("a wrong password and an unknown email give the same generic result", async () => {
    expect(await attempt("ana@example.com", WRONG)).toEqual({
      status: "invalid",
    });
    expect(await attempt("nobody@example.com", RIGHT)).toEqual({
      status: "invalid",
    });
  });

  test("signs in with the right password and clears the throttle", async () => {
    for (let i = 0; i < 3; i++) await attempt("ana@example.com", WRONG);
    expect(await attempt("ana@example.com", RIGHT)).toEqual({
      status: "signed-in",
    });
    expect(readSession().status).toBe("signed-in");
    const raw = getBackend().getItem(THROTTLE_KEY);
    expect(raw === null ? {} : JSON.parse(raw)).not.toHaveProperty([
      "ana@example.com",
    ]);
  });

  test("locks after 5 failures and never hashes while locked", async () => {
    const spy = vi.spyOn(crypto.subtle, "deriveBits");
    for (let i = 0; i < 4; i++) await attempt("ana@example.com", WRONG);
    expect(await attempt("ana@example.com", WRONG)).toEqual({
      status: "locked",
      lockedUntil: "2026-09-28T12:00:30.000Z",
    });
    spy.mockClear();
    expect(await attempt("ana@example.com", RIGHT)).toEqual({
      status: "locked",
      lockedUntil: "2026-09-28T12:00:30.000Z",
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    vi.setSystemTime(new Date("2026-09-28T12:00:30.000Z"));
    expect(await attempt("ana@example.com", RIGHT)).toEqual({
      status: "signed-in",
    });
  });

  test("normalizes the email before looking it up", async () => {
    expect(await attempt(" ANA@Example.com ", RIGHT)).toEqual({
      status: "signed-in",
    });
  });
});
