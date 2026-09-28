import { beforeEach, expect, test } from "vitest";
import { setBackend } from "@/storage/backend";
import { createMemoryStorage } from "@/storage/memory-storage";
import { createCredential, verifyCredential } from "./credential";

beforeEach(() => setBackend(createMemoryStorage()));

test("verify accepts the right password and rejects a wrong one", async () => {
  const credential = await createCredential("correct horse battery staple");
  expect(
    await verifyCredential("correct horse battery staple", credential),
  ).toBe(true);
  expect(
    await verifyCredential("correct horse battery stapl", credential),
  ).toBe(false);
});

test("stores PBKDF2-SHA256 with 600000 iterations and base64 fields", async () => {
  const a = await createCredential("correct horse battery staple");
  const b = await createCredential("correct horse battery staple");
  expect(a.algo).toBe("PBKDF2-SHA256");
  expect(a.iterations).toBe(600000);
  expect(a.salt).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  expect(a.hash).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  expect(b.salt).not.toBe(a.salt);
  expect(b.hash).not.toBe(a.hash);
});
