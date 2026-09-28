# Security baseline

Decided in the ticket [Set the security baseline for the simulation and card-data handling](https://github.com/TadeoOL/tadeo-5396/issues/14).

This app is a simulation. Its auth is a UX simulation and its payment gateway is a mock (see [Auth](auth.md) and [ADR 0001](../adr/0001-browser-as-ledger.md)). This baseline has two goals: implement the measures that are cheap and real, and write down the limits the design accepts on purpose, so none of them passes as an oversight.

## Threat model

| Asset | Where it lives | Main threat |
|---|---|---|
| Credential (PBKDF2 hash and salt) | localStorage | Any script on the origin reads it and runs an offline guessing attack |
| Session | localStorage | Any script on the origin reads or forges it |
| Balance and Top-ups, including the Card | localStorage | Any script on the origin reads or edits them |
| Charges, including the Card | Server memory | Anyone who knows a `reference` reads the Charge; a flood of `POST`s fills the memory |
| The Outage switch | Server memory | Anyone can turn it on for everyone |

**Trust boundary.** Anything that can run script on the origin can read and edit all browser data: devtools, a browser extension or an XSS. The browser is therefore not a security boundary, and the design does not pretend otherwise. The measures below reduce the XSS risk and keep real card data out of storage. They do not make localStorage safe.

**Attackers considered:** a curious user with devtools, a script injected through XSS, and anonymous clients calling the public API directly.

## Implemented

### Card data

The brief requires the card number and CVV to be in SnailPay's responses and in localStorage, and to be always fictitious. SnailPay enforces "fictitious" rather than assuming it:

- **Only numbers from the Scenario catalog are echoed verbatim.** They are the only numbers SnailPay recognizes, so they are fictitious by construction.
- **Any other number is masked in every response**, whatever the status (`400`, `402`, `422`, …):
  - `card_number` keeps the first 6 and last 4 digits and replaces the rest with `*` (`111122******4444`). A value shorter than 10 characters is fully replaced with `*`.
  - `security_code` is `null`.
  - The decline itself does not change: an unknown number still gets `402 rejected / cc_rejected_bad_filled_card_number`.
- As a result, a real card that someone typed or that the browser autofilled is never stored in full, neither in the Charge store nor in the ledger.
- **Idempotency does not need the raw card.** For each key, the Charge store keeps the response and a SHA-256 hash of the normalized request payload. The "same key, different payload" check compares hashes, so a replay of a masked Charge still works.
- **The lookup by `reference`** returns the stored body. With the masking above, it can only reveal fictitious Cards, so it needs no auth.

**In the UI:**

- The card number is shown only as `•••• 1234` (the last 4 digits), in the Top-up history and anywhere else.
- The CVV is never shown from the ledger or a response, although the ledger holds it. The only CVV on screen is the one the User types in the Top-up form: it is masked as `•••` while the Top-up is Processing, and the form keeps it after a Declined or Failed result so "Try again" can resend it.
- The card fields use `autocomplete="off"`. That stops the browser from offering a real saved card or offering to save the one typed.

**Never logged.** Request bodies and query strings are never logged ([Architecture](../architecture.md#errors-and-logging)), so no card data reaches a log.

### XSS

XSS is the main risk to localStorage: one injected script reads everything.

- React escapes every value it renders, including the full name.
- **`dangerouslySetInnerHTML` is banned by lint.** The web ESLint config has a `no-restricted-syntax` rule on `JSXAttribute[name.name='dangerouslySetInnerHTML']`, so the commitment in [Auth](auth.md) is checked by CI, not by memory. It adds no dependency.
- **Content Security Policy** from `helmet()`'s defaults. `script-src 'self'` blocks inline and third-party scripts. The Vite build emits no inline scripts. Styles allow `'unsafe-inline'`, because Sonner and Radix inject styles at runtime. The CSP only applies to the production build that Express serves; the Vite dev server does not send it.
- No user-supplied URL is rendered as a link, so `javascript:` URLs cannot be injected.

### Express

| Measure | Setting | Why |
|---|---|---|
| Security headers | `helmet()` with its defaults | CSP (above), HSTS, `nosniff`, `frame-ancestors 'self'`, no `X-Powered-By` |
| CORS | No `cors` package | Web and API share one origin, so the browser's same-origin policy already blocks other sites. Note that CORS never protects the server from direct calls. |
| Body size | `express.json({ limit: '10kb' })` | The largest valid body is well under 1 KB |
| Input validation | Zod on every request ([Architecture](../architecture.md)) | Already decided |
| Errors | One central handler, no stack trace in responses | Already decided |
| Request id | The client's `X-Request-Id` is used only if it is a UUID; otherwise one is generated | A free-form header would let a caller inject content into the logs |
| Proxy | `app.set('trust proxy', n)`, with `n` measured on Render ([Deployment](../deployment.md#proxy-hop-count)) | Render sits behind Cloudflare and its load balancer and does not document the hop count. Without the setting, every request would share the proxy's IP and the rate limiter would limit everyone at once. A wrong count keys the limiter on the wrong IP. |

### Rate limiting

`express-rate-limit`, in memory, keyed by client IP, on the two Charge routes only:

| Route | Limit | Why |
|---|---|---|
| `POST /api/snailpay/charges` | 10 per minute | Far above a person using the form; bounds how fast the uncapped Charge store can grow |
| `GET /api/snailpay/charges?reference=` | 60 per minute | Allows the five Reconciliation attempts (2/4/8/16/32 s) of several Unknown Top-ups at once |

The `429` follows the rules in [Top-up reliability](top-up-reliability.md#rate-limiting):

- It uses the Charge response shape: `status: error`, `status_detail: rate_limited`, the request's fields echoed with the masking above.
- It carries a `Retry-After` header in seconds.
- It is never stored for idempotent replay.
- On the `POST` it means no Charge was created, so the Top-up is Failed. On the lookup, the Top-up stays Unknown and is retried.

The race-day `GET`s, the Outage routes and `/api/health` are not limited.

### Transport and dependencies

- **HTTPS**: the host terminates TLS, and `helmet()` sends HSTS. Web Crypto needs a secure context, so the app only works on `https://` or `localhost` ([Auth](auth.md)).
- **Dependency audit**: the `ci` job runs `npm audit --omit=dev --audit-level=high` after `npm ci` ([Conventions](../conventions.md#continuous-integration)). A new advisory can fail a PR that did not cause it. That is the intended signal.

## Documented only

These limits are accepted on purpose. Each one is explained in the response document.

| Limit | Why it is accepted | What a production version does |
|---|---|---|
| The Credential is readable in localStorage and open to offline guessing | The brief requires a local simulation. PBKDF2 at 600k iterations only slows guessing down. | Credentials on the server, hashed with Argon2id (see the database proposal) |
| Any script on the origin can read or forge the Session | Same trust boundary | An `httpOnly`, `Secure`, `SameSite` cookie |
| The Balance can be edited in devtools | The browser is the ledger ([ADR 0001](../adr/0001-browser-as-ledger.md)) | A server-side ledger |
| The sign-in throttle is lifted by deleting its key | It lives in localStorage ([Auth](auth.md)) | Throttling per IP and per account on the server |
| The server checks only the format of `payer_id` and `payer_email` | The server has no Users | The Payer comes from the authenticated session, never from the body |
| SnailPay returns the full card number and CVV | The brief requires it. Real gateways return only the first 6 and last 4 digits and never the CVV. | Tokenization; the CVV is never stored |
| The Outage is global and needs no auth | It is a demo tool the reviewer must be able to use | No such switch exists |
| The Charge store has no cap | The rate limiter bounds its growth, and a restart empties it | A database with retention rules |
| The rate limiter is in memory and per instance | There is one instance | A shared store such as Redis |
| Cross-tab writes are not atomic | localStorage has no transactions ([State and persistence](state-and-persistence.md)) | A server-side ledger |

## Left out

| Left out | Reason |
|---|---|
| A `cors` allowlist | Same origin; it would protect nothing |
| CSRF tokens | There are no cookies, so there is no ambient credential to abuse |
| Encrypting localStorage | The key would have to live in the same origin, so any script that reads the data can also read the key |
| Auth on the Outage switch | The reviewer needs it on the public deployment |
| Dependency update bots | Already rejected in [Conventions](../conventions.md) |
