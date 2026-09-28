# Browser-side password hashing and session handling

Question: what is the most defensible way to store and verify a password when registration and login are a local simulation backed by `localStorage`, using browser-native APIs where possible? (Issue #3, researched 2026-09.)

## Recommendation

- **Algorithm**: Web Crypto `PBKDF2` with HMAC-SHA-256, **600,000 iterations**, **16-byte random salt** per password (`crypto.getRandomValues`), **256-bit** derived key. This is OWASP's listed PBKDF2 setting and needs no dependency.
- **Storage**: never persist the password or its confirmation. Store `{ algo, iterations, salt, hash }` with salt and hash as base64. Storing `iterations` and `algo` lets the cost go up later: rehash on the next successful login.
- **Verify**: re-derive with the stored salt and iterations, then compare the full byte arrays with no early exit. Show "Invalid email or password" for both unknown email and wrong password.
- **Hash in the browser**, not in Express. The server stores nothing, so sending it the password adds a plaintext hop and no protection.
- **No Argon2/bcrypt WASM library.** Argon2id is OWASP's first choice, but here it only slows offline cracking of a record that someone already copied out of `localStorage`. It is the documented upgrade path, not the default.
- **Session**: `{ id: crypto.randomUUID(), email, issuedAt, expiresAt }` under its own key, with a fixed absolute expiry and a new id on every login. Logout removes that key. Other tabs react through the `storage` event.
- **Say the limit plainly**: this is a UX simulation, not an authentication boundary. Hashing protects the user's real password against casual disclosure and reuse. It does not protect the app's data (see §5).

### Stored shapes

```json
{
  "user": {
    "fullName": "Ana López",
    "email": "ana@example.com",
    "password": {
      "algo": "PBKDF2-SHA256",
      "iterations": 600000,
      "salt": "NjtE9/W8ZpaFzvX8FDtJcw==",
      "hash": "Zz7D+7+aeTZlJ8y9i8nxMuDTYtgRlhBxz8codHZf67s="
    }
  },
  "session": {
    "id": "87b0e36d-7be9-48a5-86f4-671c4daf8daf",
    "email": "ana@example.com",
    "issuedAt": 1790000000000,
    "expiresAt": 1790043200000
  }
}
```

Use two separate `localStorage` keys, one for user(s) and one for the session, so logout is one `removeItem` and never touches the account record. Normalize the email (`trim().toLowerCase()`) before using it as a lookup key.

### Reference implementation (verified)

Tested on Node 24.15 and in Vitest 5 + jsdom 30. It passes `tsc --strict --noUncheckedIndexedAccess`.

```ts
export type PasswordRecord = { algo: "PBKDF2-SHA256"; iterations: number; salt: string; hash: string };

const ITERATIONS = 600_000; // OWASP minimum for PBKDF2-HMAC-SHA256
const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = ITERATIONS): Promise<PasswordRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { algo: "PBKDF2-SHA256", iterations, salt: toB64(salt), hash: toB64(await derive(password, salt, iterations)) };
}

export async function verifyPassword(password: string, rec: PasswordRecord): Promise<boolean> {
  const actual = await derive(password, fromB64(rec.salt), rec.iterations);
  const expected = fromB64(rec.hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= actual[i]! ^ expected[i]!; // no early exit
  return diff === 0;
}
```

## Details

### 1. PBKDF2 availability and OWASP guidance

- `SubtleCrypto.deriveBits` is Baseline "widely available" (since Jan 2020) and works in Web Workers. The derivation algorithms are ECDH, X25519, HKDF and PBKDF2. There is no Argon2, scrypt or bcrypt.
- OWASP's order of preference is Argon2id, then scrypt, then bcrypt (legacy only), then PBKDF2 (the FIPS-140 option). For PBKDF2 it lists **600,000 iterations with HMAC-SHA-256**, 220,000 with SHA-512, and 1,400,000 with SHA-1 (legacy only).
- **Secure context only.** `crypto.subtle` and `crypto.randomUUID()` need HTTPS or a loopback origin (`localhost`, `127.0.0.1`). `getRandomValues` is the only `Crypto` member that also works on insecure origins. Gotcha: opening the Vite dev server by LAN IP (for example `http://192.168.x.x:5173` to test on a phone) is **not** a secure context, so registration would throw. Any deployment must use HTTPS. If `crypto.subtle` is missing, fail with a clear message. Never fall back to a weaker hash.
- Cost: 600k iterations took **about 80–160 ms per derivation** in Node 24 on an Apple Silicon laptop. Low-end phones will be slower. `deriveBits` returns a Promise, so a Web Worker is not needed. Disable the submit button and show a pending state while it runs.
- NIST SP 800-63B-4 says to normalize Unicode passwords with **NFC** before hashing. That is a single `password.normalize("NFC")` call.

### 2. Salt

- MDN `Pbkdf2Params`: the salt should be random and at least 16 bytes. It does not need to be secret. NIST's minimum is 32 bits. Use **16 bytes from `crypto.getRandomValues`**, a new salt per password, including on every re-hash.
- No pepper. OWASP says a pepper must be stored apart from the hashes. In a browser-only app there is nowhere to put it that is out of the attacker's reach, so it adds nothing.
- Encoding: base64 through `btoa`/`atob` (the two helpers above). `Uint8Array.prototype.toBase64()` is Baseline 2025 "newly available", but it is **undefined in Node 24** (verified), so Vitest or Node code that uses it would break.

### 3. Constant-time comparison

- The browser has no `timingSafeEqual`. Node has `crypto.timingSafeEqual`, which needs equal-length inputs. Use the XOR-accumulate loop above: check the length first, then read every byte without exiting early.
- Being honest: a timing attack does not apply here. Anyone who can time the comparison can already read the stored hash. The loop is cheap hygiene that shows intent. Do not add a dependency for it. Never compare hashes as strings with `===` in code meant to model server behavior.

### 4. Argon2 / bcrypt (WASM) vs native Web Crypto

| Option | Pros | Cons |
|---|---|---|
| **Web Crypto PBKDF2** (chosen) | Built in, zero bytes added, OWASP-listed parameters, runs in Node/jsdom tests unchanged | Not memory-hard, so GPUs crack a leaked record faster than they would Argon2id |
| Argon2id via `hash-wasm` | OWASP first choice (m=19 MiB, t=2, p=1). About 11 kB gzipped, zero deps. `argon2Verify` plus PHC string output (`$argon2id$v=19$m=19456,t=2,p=1$…`) | New dependency and WASM load. A strict CSP needs `'wasm-unsafe-eval'`. The benefit only applies to a record that has already leaked |
| bcrypt via WASM | Well known | OWASP calls it "legacy systems only". 72-byte input limit. No advantage over either option above |

- Native Argon2 in browsers is not available yet. The WICG "Modern Algorithms in the Web Cryptography API" draft includes Argon2, and Node implements it (`crypto.argon2` exists in Node 24). But Chrome's Sept 2026 intent-to-ship for WebCrypto algorithm updates covers only ML-KEM, ML-DSA, ChaCha20-Poly1305 and X-Wing.
- Verdict: PBKDF2. The `algo` field keeps Argon2id available as a later swap if a reviewer weighs "OWASP's preferred algorithm" highly.

### 5. What an attacker with `localStorage` access (or XSS) can do anyway

Anyone who can run script on this origin can do all of the following, and no hashing scheme changes it. That includes DevTools on a shared machine, a malicious extension, or an XSS bug.

- **Skip login entirely**: write a valid-looking `session` key. The route guard only reads `localStorage`.
- **Take over the account**: replace `user.password` with a hash they generated.
- **Change the balance** or bet history directly. The balance is a client-owned number.
- **Crack offline**: copy the salt and hash and brute-force it. PBKDF2 at 600k raises the cost per guess but does not stop weak passwords.
- **Capture the plaintext** from the login form as it is typed (XSS or an extension). This happens before any hashing.
- OWASP's HTML5 cheat sheet: do not keep session identifiers or sensitive data in `localStorage`, because any XSS can read all of it and can also poison it.

Suggested wording for the response document:

> Registration and login run entirely in the browser, so they simulate authentication; they are not a security boundary. Anyone who can run script on this origin can read or rewrite every stored value, including the session and the balance. The password is never stored: only a salted PBKDF2-SHA-256 hash (600,000 iterations, per OWASP) is kept, so casual disclosure of the browser's storage does not reveal a password the user may reuse elsewhere, and each offline guess is deliberately expensive. In a production system credentials, sessions and balance would live on the server (Argon2id, an HttpOnly/Secure/SameSite cookie session, TLS), and the client would hold no authority.

### 6. Hashing in the browser vs. on the Express side

- **Browser.** Express keeps no user store, so a `/hash` endpoint would only take the plaintext and return a hash for the client to keep and compare. That adds a plaintext hop (and plain HTTP in local dev), a network dependency on login, and an endpoint with no enforcement behind it.
- Hashing on the server only matters when the server also **owns the record and the verification**. That belongs in the written database proposal: Argon2id on the server (`node:crypto.argon2` in Node 24, or scrypt), TLS, and no pre-hashing on the client.

### 7. Session representation and cross-tab logout

- **Token**: `crypto.randomUUID()` (v4, CSPRNG, secure context). Here it is mostly an identity for the session instance: a new id on each login means other tabs can tell "a different login replaced mine" apart from "same session". It is not a secret the server checks. Do not present it as one.
- **Expiry**: a fixed `expiresAt` (for example `issuedAt + 12 h`) with no sliding renewal. Check it when the app loads and in the route guard. An expired session is treated as logged out and its key removed. No timers.
- **Persistence**: the session in `localStorage` survives reloads, which the brief requires. `sessionStorage` would not be shared across tabs and would not fire cross-tab events.
- **Cross-tab sync**: the `storage` event fires in **other** same-origin tabs, never in the tab that wrote the value. For a `localStorage.clear()` it fires with `key === null`:

```ts
window.addEventListener("storage", (e) => {
  if (e.storageArea === localStorage && (e.key === SESSION_KEY || e.key === null)) syncSessionFromStorage();
});
```

  The tab that logs out must update its own React state directly, because it gets no event.
- The same mechanism applies to the **balance** (see "Implications" below).

## Implications for other tickets

- **Auth spec / validation**: NIST SP 800-63B-4 says passwords used as a single factor must be at least **15 characters**, verifiers should allow at least 64, and there must be **no composition rules** (no "one uppercase + one digit"). Choosing 8 characters or composition rules for demo convenience is a deliberate deviation and should be written down. Do not truncate passwords.
- **State ownership**: two tabs can each hold a balance in memory. After a SnailPay top-up in tab A, a stale tab B that writes its own value causes a lost update. Either re-read storage before every write, or subscribe to the `storage` event for the balance key as well.
- **Security baseline / deployment**: HTTPS or localhost only (secure context). Serve no untrusted HTML (XSS is the whole threat model). If a CSP is added, it does not need `'wasm-unsafe-eval'` while there is no WASM.
- **Testing**: Vitest 5 + jsdom 30 exposes `crypto.subtle` (verified). 600k iterations cost about 0.1 s per call, which is fine. `hashPassword` accepts an `iterations` override if speed ever matters, and verification always reads the count from the record.

## Sources

- OWASP Password Storage Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP HTML5 Security Cheat Sheet (Local Storage) — https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- NIST SP 800-63B-4, Authenticators (password rules, NFC, salt ≥ 32 bits) — https://pages.nist.gov/800-63-4/sp800-63b/authenticators/
- MDN `SubtleCrypto.deriveBits()` — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits
- MDN `Pbkdf2Params` — https://developer.mozilla.org/en-US/docs/Web/API/Pbkdf2Params
- MDN `SubtleCrypto` (secure context, algorithm table) — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
- MDN `Crypto.getRandomValues()` — https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- MDN `Crypto.randomUUID()` — https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
- MDN Secure contexts — https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts
- MDN `storage` event — https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- MDN `Uint8Array.prototype.toBase64()` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64
- hash-wasm (Argon2id/bcrypt WASM) — https://github.com/Daninet/hash-wasm
- WICG Modern Algorithms in the Web Cryptography API — https://wicg.github.io/webcrypto-modern-algos/
- blink-dev Intent to Ship: Algorithm Updates in WebCrypto (Sept 2026) — https://www.mail-archive.com/blink-dev@chromium.org/msg17349.html
- Node.js `crypto` (`timingSafeEqual`, `argon2`, `scrypt`) — https://nodejs.org/api/crypto.html
