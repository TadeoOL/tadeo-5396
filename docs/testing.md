# Testing strategy

Decided in the ticket [Define the testing strategy: what to test at each layer and why](https://github.com/TadeoOL/tadeo-5396/issues/15).

The brief sets no coverage target. It grades what was tested and why. So this strategy starts from the risks — money, the minimum-validity flow and the SnailPay integration — and tests the rules the specs define at the seams they already name. The [requirement map](#requirement-map) is the answer to "what did you test and why", so there is no coverage tool.

## Priority

Tests are written with the code they cover, in the same commit ([Conventions](conventions.md)). If time runs short, cut from tier 3 up, never from tier 1.

| Tier | What | Why it comes first |
|---|---|---|
| 1 | SnailPay over HTTP, the ledger in `storage`, Reconciliation, the end-to-end flows | Money and the minimum-validity requirement. A bug here credits twice, loses a Top-up or invalidates the submission. |
| 2 | Auth rules, the race-data generator and aggregations, the `fetch` wrapper | Logic with its own rules, where each rule has a clear right answer |
| 3 | Feature components: forms, Top-up outcomes, route guards | What the user sees. Tiers 1 and 2 already cover the logic behind it. |

## Tools

| Tool | Version | Used for | Why |
|---|---|---|---|
| Vitest | 5 | Every unit, integration and component test | Runs TypeScript directly and shares Vite's config in `web`. One runner, one syntax and one report for all three workspaces. |
| Supertest | 7 | HTTP tests of the API | Calls `createApp(deps)` without `listen`, so there is no port to manage. It is the usual tool for Express, so reviewers read it at a glance. |
| jsdom | current | DOM environment for `web` | The default that Testing Library and Radix document. Its one known problem does not affect us (see [Rules](#rules)). |
| Testing Library (`react`, `user-event`, `jest-dom`) | current | Component tests | Queries by role and label, as a user finds things |
| Playwright | 1.63+ | End-to-end, Chromium only | Runs the production build in a real browser |
| `@axe-core/playwright` | 4.13+ | Accessibility checks inside the end-to-end specs | A real browser computes color contrast, which jsdom cannot |

**Rejected:**
- **`node:test` for the API.** It adds no dependency, but it would mean two runners and two assertion styles in one repository.
- **MSW.** There are only three endpoints, and one `fetch` stub per test says exactly what the network returns. Add it if the same handlers start repeating across many files.
- **`vitest-axe` in component tests.** It cannot check contrast in jsdom, and `eslint-plugin-jsx-a11y` already covers the static rules.
- **fast-check.** A loop over a fixed list of seeds covers the generator's invariants without another concept to explain.
- **A coverage tool.** See the introduction.

## Layout and commands

- Tests sit next to the code they cover: `charges.ts` → `charges.test.ts`, `TopUpForm.tsx` → `TopUpForm.test.tsx`.
- End-to-end specs live in `e2e/` at the root.
- One root `vitest.config.ts` defines `test.projects`, one per workspace:
  - `api` and `contracts` use the `node` environment.
  - `web` uses `jsdom`, with a setup file that loads the `jest-dom` matchers.
- `playwright.config.ts` sits at the root.

| Script | What it does |
|---|---|
| `npm test` | `vitest run`: every project, once. Part of `npm run check`. |
| `npm run test:watch` | `vitest`: watch mode while developing |
| `npm run test:e2e` | `playwright test`. Needs `npm run build` first, and a one-time `npx playwright install chromium`. Not part of `check`, because it needs a build and a browser. |

To run a single project: `npx vitest run --project web`.

## Seams

Tests exercise only these interfaces, never internals.

### Tier 1

**SnailPay over HTTP.** Supertest against `createApp(deps)`, with a fresh Charge store and a `sleep` that resolves at once, created for each test. The core in `charges.ts` is covered through HTTP; there are no separate core tests, because the HTTP tests are just as fast and they also check the contract.

- Each [Scenario](specs/snailpay-api.md#scenario-catalog) gets the status, `status_detail` and full response shape:
  - approved
  - the three `cc_rejected_bad_filled_*` declines
  - insufficient amount and high risk
  - the delayed approval, which asserts that `sleep` was called with 30 000 ms
- `400 invalid_request` for:
  - a missing or non-UUID `X-Idempotency-Key`
  - malformed JSON
  - each format rule, with `errors[]`
- **Outage:**
  - `PUT` on and off, and `400` for a bad body.
  - `503 service_unavailable` with `Retry-After` on both Charge routes.
  - `/api/health` still answers `200` during an Outage.
  - During an Outage no Charge is stored, so a later lookup returns `404`.
- **Idempotency:**
  - The same key and payload replays the stored status, body and `id`, with `Idempotent-Replayed: true`.
  - The same key with another payload gets `422 idempotency_key_reused`, and the original is left unchanged.
  - A `400` or a `503` is not stored.
- **Lookup:** `200` with the stored body, `404` with `reference` echoed, `400` for a non-UUID reference.
- **Security** ([Security baseline](specs/security.md)):
  - An unknown card number is masked and returns `security_code: null`, while a catalog number is echoed verbatim.
  - The 11th `POST` in a minute gets `429 rate_limited` with `Retry-After`.
- **Errors:** an unknown error returns `500 internal_error` inside the error envelope, with `X-Request-Id` echoed.

**The ledger in `storage`.** The real module over an in-memory `Storage` ([State and persistence](specs/state-and-persistence.md#write-rules)).

- `startTopUp` writes the Top-up as `pending` before any request is sent.
- Transitions:
  - The allowed transitions are applied.
  - A transition out of a final outcome is refused.
- Crediting:
  - Only the move into `credited` adds to the Balance.
  - Settling an already-credited Top-up again is a no-op, which covers the two-tab race.
- Loading:
  - On load, `pending` becomes `unknown`.
  - A missing ledger reads as `$0`.
- A broken invariant or invalid data raises the "Reset local data" error.
- A `storage` event dispatched by hand for the signed-in User's key notifies subscribers.

**Reconciliation.** Uses fake timers and a stubbed `fetch` ([Top-up reliability](specs/top-up-reliability.md)).

- The mapping of every POST result and lookup result to an outcome. This includes a mismatched `reference` and an unparseable body, both of which map to Unknown.
- The backoff at 2, 4, 8, 16 and 32 s. After a `503` or `429`, the wait is the larger of `Retry-After` and the backoff step.
- A `404` settles as Failed only after 2 min; a younger Top-up stays Unknown.

**End to end.** Playwright against the production build, with Express serving `apps/web/dist`. `webServer` waits on `/api/health`.

1. **Minimum validity:**
   - Register, sign out, sign in with the same data.
   - The dashboard shows the User's name and a `$0` Balance.
   - Then a protected route opened without a Session redirects to sign-in.
2. **Approved Top-up:**
   - Pay with the approved card.
   - The Balance updates and the approval is announced.
   - After a reload, the Balance is still there.

Each spec runs axe on every screen it visits and fails on `serious` or `critical` violations. The declines, the Outage and the timeout stay out of end-to-end: tiers 1 and 3 cover them, and the 30 s Scenario would slow the suite for no new signal.

### Tier 2

**Auth** ([Auth](specs/auth.md)): the storage and auth modules over an in-memory `Storage`.

- Normalization: email case, NFKC, passwords that are not trimmed.
- Password policy: 15 to 128 characters, no composition rules.
- Credential:
  - `verify` accepts the right password and rejects a wrong one.
  - The stored record has `iterations: 600000` and base64 fields.
- Sign-up rejects a duplicate email even when the check runs after the async hash.
- Sign-in:
  - A wrong password and an unknown email give the same generic error.
  - Throttle: 5 failures lock the email for 30 s, and the lock doubles up to 15 min. A locked attempt never hashes. A success clears the entry.
- Session validity: valid, expired at 24 h, missing User, malformed.

**Race data** ([Simulated data](specs/simulated-data.md)):

- The generator runs over a fixed list of about 50 dates and several `userId`s and checks every invariant:
  - 6 Races, numbered 1 to 6
  - one winner each, so Wins sum to 6
  - 4 to 12 Bets
  - every outcome derived from its Race's winner
- It is deterministic: same input, same output. Another `userId` gives other Bets over the same Races.
- One case with known literal values for one date and one User, worked out by hand, so the test does not recompute what the code computes.
- The two aggregations, Wins per Snail and won vs lost, from literal inputs.
- Over HTTP:
  - `400` for a bad date, an impossible date or a bad `userId`.
  - The `Cache-Control` and `ETag` headers.

**`fetch` wrapper** ([Frontend stack](specs/frontend-stack.md#http)):

- It classifies each response as parsed, timeout, abort, network error or unparseable body.
- A timeout is simulated by a `fetch` that rejects with `DOMException('…', 'TimeoutError')`.
- A separate test checks that `fetch` receives an `AbortSignal`.

### Tier 3

**Feature components.** Each feature is rendered whole, container and presentational together, with the real `storage` module over an in-memory `Storage` and a stubbed `fetch`. Queries go by role and label. Presentational components are not tested on their own, and there are no snapshots.

- **Sign-up:**
  - Validation errors are shown for each field.
  - A duplicate email shows its explicit message.
  - Success lands on the dashboard.
- **Sign-in:**
  - Bad credentials show the generic error.
  - After 5 failures the lock message appears. Its duration and escalation are tested in tier 2.
- **Top-up:**
  - Form validation.
  - The button is disabled while a Top-up is pending.
  - One test per visible outcome:
    - Credited: the Balance updates and the approval is announced.
    - Declined: the reason is shown.
    - Failed.
    - Unknown: a "Check again" action is offered.
- **Guards:**
  - `RequireSession` sends a visitor with no Session to sign-in.
  - `PublicOnly` sends a signed-in User to the dashboard.

The dashboard has no component tests: its logic is the aggregations (tier 2), and the end-to-end spec sees the screen.

## Rules

- **Fresh dependencies per test.** Each API test builds its own app with `createApp(deps)`. So the rate limiter must be created inside `createApp`, not at module scope; otherwise the 11th `POST` of the whole suite would get a `429`. Each web test builds its own in-memory `Storage`.
- **No byte assertions in jsdom.** In jsdom, `TextEncoder` output and `deriveBits` results come from another realm, so `toEqual(new Uint8Array(…))` and `instanceof ArrayBuffer` fail ([vitest#5183](https://github.com/vitest-dev/vitest/issues/5183)). Assert on base64 strings or on `verify`'s boolean. Web Crypto itself works.
- **Fake timers only in tests without Testing Library.** Reconciliation, throttle and Session tests use `vi.useFakeTimers()`, `vi.setSystemTime()` and `vi.advanceTimersByTimeAsync()`. Component tests use real timers, because `user-event` and `findBy*` hang under fake timers unless you add an undocumented shim.
- **The 10 s timeout is never waited out.** Fake timers do not fake `AbortSignal.timeout` ([fake-timers#521](https://github.com/sinonjs/fake-timers/issues/521)), so tests stub a `fetch` that rejects with `TimeoutError`.
- **Real PBKDF2 cost.** Tests hash with the production 600,000 iterations, which take about 75 ms per hash on a laptop. Nothing is injected to lower it. Revisit only if the `web` suite takes more than about 10 s.
- **Expected values come from the specs,** as literals, never recomputed the way the code computes them.
- **Test names use the glossary** in [`CONTEXT.md`](../CONTEXT.md): Top-up, Charge, Credited, Reconciliation, Race Day.

## Continuous integration

The `ci` job ([Conventions](conventions.md#continuous-integration)) runs `npm test` with the other checks. After `build` it adds:

1. `npx playwright install --with-deps --only-shell chromium`
2. `npm run test:e2e`
3. On failure only, it uploads `playwright-report/` as an artifact. Traces are kept on failure (`trace: 'retain-on-failure'`).

Playwright runs with `retries: 0`: a flaky test gets fixed, not retried.

## Requirement map

| Requirement | Tests |
|---|---|
| Register with full name, email, password and confirmation, with validations | Tier 3 sign-up; tier 2 normalization and password policy |
| How the password is handled and stored | Tier 2 Credential (PBKDF2, 600k, base64, no password stored) |
| Sign out, sign in again with the same data | End-to-end minimum validity; tier 3 sign-in |
| Dashboard only with an active Session | End-to-end minimum validity; tier 3 guards; tier 2 Session validity |
| Data kept after a reload | End-to-end approved Top-up (reload); tier 1 ledger on load |
| New Users start at `$0` | End-to-end minimum validity; tier 1 missing ledger reads as `$0` |
| Donut of won and lost Bets, bars of Snail Wins, congruent simulated data | Tier 2 generator invariants and aggregations |
| Approved Charge raises the Balance, is stored and shown at once | Tier 1 SnailPay approved and ledger crediting; tier 3 Credited; end-to-end approved Top-up |
| Transaction errors with a useful `status_detail` | Tier 1 each decline and format error; tier 3 Declined |
| Documented system error, during which nothing is approved | Tier 1 Outage; tier 3 Failed |
| Every response has the nine fields | Tier 1 response shape for every status |
| A failure never changes the Balance and never produces a false success | Tier 1 ledger (only `credited` credits, once); Reconciliation mapping (unreadable means Unknown, never Credited) |
| Card number and CVV in responses and localStorage, always fictitious | Tier 1 catalog numbers echoed, others masked |
| Timeout handling | Tier 1 delayed Scenario and Reconciliation; tier 2 `fetch` wrapper timeout; tier 3 Unknown |
| Reproduce each SnailPay response | Tier 1 runs every row of the [reproduction table](specs/snailpay-api.md#reproduction-table-seed) |

## Not tested, and why

- **Zod schemas in `contracts` on their own.** Every schema is exercised by the API tests and the `fetch` wrapper tests.
- **Presentational components alone, and snapshots.** They break on markup changes that do not change behavior.
- **Chart rendering.** Recharts is a dependency. The data it receives comes from tested aggregations, and the text summaries are visible in end-to-end.
- **CSP and `helmet` headers.** They come from library defaults with no custom logic.
- **The throttle across a reload in end-to-end.** It would repeat the tier 2 logic at a much higher cost.
