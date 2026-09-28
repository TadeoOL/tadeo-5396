import { beforeEach, expect, test } from "vitest";
import { getBackend, setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { readSession } from "@/storage/session";
import { readUsers, USERS_KEY } from "@/storage/users";
import { signUp } from "./auth";
import { signUpSchema } from "./schemas";

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
