# Auth simulation

How sign-up, sign-in, sign-out, Session restore and dashboard protection work. Sign-up and sign-in are a local simulation: everything runs in the browser, and Express has no auth endpoints. Terms follow [`CONTEXT.md`](../../CONTEXT.md). Storage keys and write rules come from [State and persistence](state-and-persistence.md). The hashing research is in [the password-hashing write-up](https://github.com/TadeoOL/tadeo-5396/blob/research/password-hashing-web-crypto/docs/research/password-hashing-web-crypto.md).

## Trust boundary

Anyone with script access to the origin (devtools, an extension, an XSS) can read and edit every `snailrace.v1.*` key. They can forge a Session, swap a hash, edit a Balance or read a password as it is typed. The auth here therefore simulates the user experience of real auth. It is not a security boundary. Hashing protects only the User's real password from casual disclosure and from reuse on other sites. Several decisions below follow from this boundary, and each one says so.

## Registration fields

Validation runs on submit and on blur. Errors are shown next to their field unless stated otherwise.

| Field | Normalization | Rules | Error |
|---|---|---|---|
| Full name | Trim, and collapse inner whitespace to one space | 2–80 characters after normalization; any Unicode except control characters | "Enter your full name (2–80 characters)." |
| Email | Trim, and lowercase the whole address | Simple format `local@domain.tld`, no whitespace, at most 254 characters | "Enter a valid email address." |
| Password | Unicode NFKC. **Not trimmed**: spaces count | 15–128 characters; no composition rules | "Use at least 15 characters. A short phrase works well." |
| Confirm password | Same as password | Must equal the password exactly | "Passwords don't match." (on the confirmation field) |

- **Password policy** follows NIST SP 800-63B-4 for single-factor authentication: a 15-character minimum and no composition rules (no required uppercase letters, digits or symbols). The 128-character maximum bounds the key-derivation input without blocking long passphrases. The help text suggests a passphrase to offset the length. There is no common-password blocklist, since it would add a dataset for little gain in a local simulation.
- **Email normalization** applies no provider-specific rules (for example, removing Gmail dots). The normalized email is what gets stored and compared.
- **Full name** accepts real-world names (a single word, apostrophes, hyphens, accents, non-Latin scripts). React escapes it when it renders, and nothing renders it through `dangerouslySetInnerHTML`.
- The form accepts no file attachments.

## Duplicate email

If the normalized email already belongs to a User, sign-up fails with a form-level message, "An account with this email already exists.", and a link to sign in.

This reveals that the email exists, which a server-backed app would usually hide to prevent account enumeration. Here the Users registry sits in localStorage, readable by anyone at the keyboard, so hiding it would protect nothing and only make the UX worse. Sign-in keeps its generic message because its failure has two possible causes.

## Credential

```ts
type Credential = {
  algo: 'PBKDF2-SHA256';
  iterations: number; // 600000
  salt: string;       // base64, 16 random bytes from crypto.getRandomValues
  hash: string;       // base64, 32 bytes
};
```

- The hash is derived in the browser with Web Crypto `PBKDF2` (HMAC-SHA-256, 600,000 iterations, per OWASP) over the NFKC-normalized password. There is no dependency and no server hop: sending the password to Express would add a plaintext hop and protect nothing, because the server stores no Users.
- The password and its confirmation are never persisted or logged.
- Verification re-derives the hash with the stored `salt` and `iterations`, then compares every byte without an early exit.
- `algo` and `iterations` make a future cost change possible (rehash on the next successful sign-in). No rehash code exists until the cost actually changes.
- `crypto.subtle` and `crypto.randomUUID` need a secure context (`localhost` or HTTPS). Opening the dev server through a LAN IP breaks sign-up and sign-in. The README must say so.
- Base64 uses `btoa`/`atob`. `Uint8Array.prototype.toBase64` is not available in Node 24, which the tests run on.

## Sign-up

1. Validate every field. If any field is invalid, show all the errors and stop.
2. Derive the Credential. This is asynchronous and takes a few hundred milliseconds. The submit button is disabled and shows a loading state from here until the flow ends, which also blocks double submits.
3. **In one synchronous task**: re-read `snailrace.v1.users`, check the email for duplicates again, add the User `{ id: crypto.randomUUID(), fullName, email, credential }`, and write the key. The async step comes *before* this read-modify-write, so two tabs registering the same email at the same time cannot both succeed.
4. Create the Session (see below) and go to `/dashboard`. Signing up signs the User in: the brief says a registered user must be able to access the app, and a second step would add friction for no gain.

- **Initial Balance of $0**: sign-up does **not** create `snailrace.v1.ledger.<userId>`. A *missing* ledger key reads as `{ balanceCents: 0, topUps: [] }` and is first written by the first Top-up. Sign-up therefore makes one data write and can never leave a User without a ledger. A missing ledger is not an *invalid* one, which still triggers the "Reset local data" error from the state spec.
- **Write failure** (for example, `QuotaExceededError`): show a form-level error ("Couldn't save your account. Free up browser storage and try again.") and create no Session.

## Sign-in

1. Check that both fields are filled in and that the email is well formed. The password policy is **not** checked here: that would only reveal the rules to someone guessing, and a stored password always satisfies them.
2. Check the throttle for the normalized email (see below). If sign-in is locked, stop.
3. Find the User by normalized email with a linear scan of `snailrace.v1.users`.
4. If there is no User, or the derived hash does not match, record a failure and show the form-level message **"Invalid email or password."** The message is the same for both causes and is not attached to either field.
5. On a match, clear the throttle entry for that email, create the Session and go to `/dashboard`.

The submit button is disabled with a loading state while the hash is derived.

- **No timing equalization**: the unknown-email path does not derive a dummy hash to take as long as a real attempt. The registry is readable directly, so the timing difference hides nothing.

### Throttle

Failed sign-ins are throttled per normalized email, as a *simulation* of the throttling a server would enforce.

```ts
// snailrace.v1.throttle
type ThrottleRecord = Record<NormalizedEmail, {
  failures: number;     // consecutive failed sign-ins since the last success or lock
  lockCount: number;    // locks applied so far; drives the backoff
  lockedUntil?: string; // ISO 8601; sign-in for this email is refused until then
}>;
```

- **Five** consecutive failures lock sign-in for that email. The first lock lasts **30 s**, and each later lock doubles, up to **15 min**: `min(30 s × 2^(lockCount − 1), 15 min)`. When a lock is applied, `failures` resets to 0.
- While locked, sign-in is refused before any hash is derived, with the form-level message "Too many attempts. Try again in N s." and a live countdown. The message is the same whether or not the email belongs to a User, because entries are keyed by the email typed.
- A successful sign-in removes that email's entry.
- Writes follow the state spec's read-modify-write rule. The key holds no Balance, so an invalid value is **discarded silently** rather than raising the "Reset local data" error.
- **Honest limit**: removing the key in devtools lifts the lock. It shows the pattern, not a defense. The real defense is the PBKDF2 cost against offline guessing, and the database proposal moves throttling to the server (per IP and per account).

## Session

```ts
// snailrace.v1.session
type SessionRecord = {
  id: string;        // crypto.randomUUID(), new on every sign-in
  userId: UserId;
  issuedAt: string;  // ISO 8601
  expiresAt: string; // ISO 8601, issuedAt + 24 h
};
```

- **One Session per browser**, shared by every tab (state spec). Each sign-in replaces the key with a new `id`, so another tab can tell "signed out and back in" apart from "same Session".
- **Absolute expiry of 24 h** from `issuedAt`. There is no idle timeout and no sliding renewal. When the Session expires, the User signs in again.
- **Valid** means all three of the following hold: the value passes its schema, `expiresAt` is in the future, and `userId` exists in `snailrace.v1.users`. Otherwise the key is removed and the User is treated as signed out.
- **Checked** on app load, in the route guards, and on every `storage` event whose key has the `snailrace.v1.` prefix or is `null` (`key === null || key.startsWith('snailrace.v1.')`), the same filter as [State and persistence](state-and-persistence.md#multi-tab-consistency). In addition, a `setTimeout` set to fire at `expiresAt` signs the User out while the tab stays open. With only one protected route, nothing else would notice the expiry.
- **Restore on reload** is a synchronous localStorage read before the first render, so there is no "loading session" state and no flash of the wrong screen.

## Sign-out

- Remove `snailrace.v1.session` and navigate to `/sign-in` with `replace`. The User and their ledger are kept.
- The tab that signs out updates its own state, since it gets no `storage` event. Other tabs react to the event and send the User to sign-in.
- Expiry signs the User out in exactly the same way.
- **A Top-up in flight is not aborted.** SnailPay may still charge, and aborting would turn a response that was going to arrive into a needless `unknown`. When the response arrives, it is written to the ledger of the User who owns the Top-up (`snailrace.v1.ledger.<userId>`), regardless of who holds the Session now. The ledger write rules already key on the Top-up's User, so this is safe. The UI no longer shows it; the User sees the result in their history on their next sign-in.

## Routes

| Path | Access | No Session | Active Session |
|---|---|---|---|
| `/sign-in` | Public only | Show the form | Redirect to `/dashboard` |
| `/sign-up` | Public only | Show the form | Redirect to `/dashboard` |
| `/dashboard` | Protected | Redirect to `/sign-in` | Show the dashboard |
| `/` and unknown paths | — | Redirect to `/sign-in` | Redirect to `/dashboard` |

- Every redirect uses `replace`, so the back button never returns to a screen that the current Session state forbids.
- There is no `returnTo`, since there is only one protected route.
- To register another User in the same browser, sign out first.

## Out of scope

Password recovery, email verification and multi-user administration (excluded by the brief); "remember me"; editing the profile, email or password.

## Constraints handed to other tickets

- **Frontend stack**: validation rules and error copy live in one place that the forms reuse. The library is that ticket's choice.
- **Security baseline**: builds on the trust boundary above. It covers CSP and the absence of `dangerouslySetInnerHTML`, which keeps the "XSS reads everything" case unlikely.
- **Testing strategy**: key cases include normalization (email case, NFKC, untrimmed passwords), the duplicate check after the hash, the generic sign-in error, throttle escalation (with fake timers), Session validity (expired, missing User, malformed) and guard redirects.
- **Database proposal**: moves Users, Credentials (server-side Argon2id), Sessions (an httpOnly cookie) and throttling to the server.
- **Screens**: states for the loading submit, form-level errors, the lock countdown and the duplicate-email link. A warning when signing out with a pending Top-up is a possible enhancement.
