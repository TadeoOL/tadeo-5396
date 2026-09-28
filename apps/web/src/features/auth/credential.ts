import type { Credential } from "@/storage/users";

const ITERATIONS = 600_000;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function createCredential(password: string): Promise<Credential> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return {
    algo: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    hash: toBase64(hash),
  };
}

export async function verifyCredential(
  password: string,
  credential: Credential,
): Promise<boolean> {
  const expected = fromBase64(credential.hash);
  const actual = await derive(
    password,
    fromBase64(credential.salt),
    credential.iterations,
  );
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}
