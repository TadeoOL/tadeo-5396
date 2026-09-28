# Screens

The layout, states and copy of every screen, so implementation has no layout or copy decisions left. Terms follow [`CONTEXT.md`](../../CONTEXT.md); the look comes from the [visual direction](visual-direction.md) and [`tokens.css`](tokens.css). The behavior behind each state is specified in [Auth](../specs/auth.md), [Top-up reliability](../specs/top-up-reliability.md), [SnailPay API](../specs/snailpay-api.md) and [Deployment](../deployment.md#warm-up-in-the-ui). This was decided in the ticket [Design the screens: auth, dashboard and top-up flow with every state](https://github.com/TadeoOL/tadeo-5396/issues/19).

| File | What it is |
| --- | --- |
| [`screens-prototype.html`](screens-prototype.html) | Every screen and state below, as a gallery with desktop and 390 px phone frames. Open it through a static server, for example `npx serve docs/design`. The copy there matches this document; spacing is indicative. |

UI copy is in English, like every artifact. Quoted strings below are final copy; `{braces}` are values.

## Global rules

- **One breakpoint**: Tailwind `md` (768 px). Below it, everything is one column and full-width primary buttons.
- **App shell**: an ink header bar with the wordmark (a Mossback silks shirt and "Snailrace"). On the dashboard it adds the User's full name (hidden below `md`) and a ghost "Sign out" button. The `['health']` query is mounted here, on every screen.
- **Titles and focus**: `document.title` is "{Screen} · Snailrace" ("Sign in", "Create account", "Dashboard"). Each screen has one `h1`, and focus moves to it on every route change.
- **Money**: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`, which renders `$1,250.00`. The Balance adds a small "MXN" after the amount. **Dates and times**: `Intl.DateTimeFormat('en-US')`.
- **Cards** are shown as `•••• {last 4}`. The CVV is never shown after submit.
- **Busy buttons**: disabled, with a spinner and a verb in progress ("Signing in…"). Inputs become read-only while the form is busy.
- **Status and alerts**: progress messages use `role="status"`; errors and outcomes use `role="alert"`. When a form-level alert appears, focus moves to it.
- **Toasts**: Sonner at `bottom-right` (Sonner spans the bottom edge on phones). A toast always repeats something the screen already shows; it is never the only place (see [Notifications](../specs/frontend-stack.md#notifications)).

## Outcome labels

The code, specs and ledger use the domain terms. The UI shows words a User understands, so an Unknown Top-up never reads as an error.

| Top-up state (domain) | UI label | Badge token | Icon |
| --- | --- | --- | --- |
| `pending` | Processing | `muted` | `Clock` |
| `unknown` | Confirming | `warning` | `CircleHelp` |
| `credited` | Approved | `success` | `Check` |
| `declined` | Declined | `destructive` | `X` |
| `failed` | Failed | `destructive` | `TriangleAlert` |

## Sign in (`/sign-in`)

Centered column, at most 26 rem wide, below the header bar. A row of the six silks shirts sits above the `h1` (decorative, `aria-hidden`).

- `h1` "Sign in"; subtitle "See how today's races went and top up your balance."
- Fields: "Email" (`autocomplete="email"`), "Password" (`autocomplete="current-password"`). Button "Sign in". Footer: "New here? [Create an account]".
- **Field errors** (on blur and submit): "Enter your email." / "Enter a valid email address." / "Enter your password." The password policy is not checked here ([Auth](../specs/auth.md#sign-in)).

| State | What shows |
| --- | --- |
| Checking | Button "Signing in…" busy; inputs read-only |
| Wrong email or password | Form-level `destructive` alert "Invalid email or password.", attached to no field. The password field is cleared. |
| Locked by the throttle | Alert with the `Clock` icon: "Too many attempts." + "Try again in {N} s." counting down every second; the button is disabled until it reaches 0, then the alert disappears |
| Session expired | Neutral alert: "Your session expired." + "Sign in again to continue." Shown when the expiry timer or a guard signed the User out because `expiresAt` passed, not after a manual sign-out. Passed as router state. |

## Create account (`/sign-up`)

Same layout as sign-in.

- `h1` "Create your account"; subtitle "Your balance starts at $0.00."
- Fields: "Full name" (`autocomplete="name"`), "Email", "Password" (`autocomplete="new-password"`, hint "At least 15 characters. A short phrase works well."), "Confirm password". Button "Create account". Footer: "Already have an account? [Sign in]".
- **Field errors** are the ones in [Auth: registration fields](../specs/auth.md#registration-fields), shown under each field; on submit, every invalid field shows at once and focus goes to the first.

| State | What shows |
| --- | --- |
| Creating | Button "Creating account…" busy (it covers the PBKDF2 derivation) |
| Duplicate email | Form-level alert "An account with this email already exists." with a "Sign in instead" link to `/sign-in` |
| Storage write failed | Form-level alert "Couldn't save your account. Free up browser storage and try again." |

## Dashboard (`/dashboard`)

Regions top to bottom, separated by dashed seams (no cards). Two columns for the charts from `md` up; one column below.

1. **Greeting**: `h1` "Hi, {full name}"; meta line "Race day · {Monday, September 28} · simulated".
2. **Balance**: `h3` "Balance", the amount (`text-5xl`, 900, 75% wide) and the "Top up" primary button (right-aligned; full width on phones). If any Top-up is `pending` or `unknown`, a `warning` line with the `CircleHelp` icon follows: "{sum} being confirmed, not included yet". The Balance reads localStorage synchronously, so it has no loading state.
3. **Wins today** (2/3 width): `h3` "Wins today", meta "6 races, 6 snails", the silks bar chart with value labels above the bars and names below, then the summary.
4. **Your bets today** (1/3 width): `h3` "Your bets today", meta "Simulated, no money involved", the donut with "{won}/{total}" and "won" in the center, then the summary with a legend: "■ {won} won · ▨ {lost} lost, out of {total} bets."
5. **Top-ups**: the history table.
6. **Simulation controls**: the Outage switch.

### Chart summaries

The summary sits under each chart as visible `meta` text and is the chart's accessible name (`aria-labelledby`).

- **Wins**: Snails with at least one Win, most Wins first (ties in Snail order), then the rest. "{Pepper} won {3} races, {Comet} {2} and {Mossback} {1}. {Drizzle, Nacho and Sprinkles} did not win." Use "race" for 1. Lists join with `Intl.ListFormat('en-US')`.
- **Bets**: "{7} won, {5} lost, out of {12} bets."

### Race data states

The two charts load independently (two queries).

| State | What shows |
| --- | --- |
| Loading | A `Skeleton` in the chart's place (a 180 px block for the bars, a 140 px circle for the donut). Headings and meta stay. |
| Error | A `destructive` alert in the chart's place: "Couldn't load today's races." (or "Couldn't load your bets.") + "Check your connection and try again." and an outline "Try again" button that refetches |

There is no empty state for the charts: a Race Day always has six Races and the Bets list always has 4–12 Bets ([Simulated data](../specs/simulated-data.md)).

### Top-up history

`h3` "Top-ups". Newest first. Columns: **When** (time for today, "Sep 27, 12:41" otherwise), **Card** (hidden below `md`), **Outcome** (the badge plus a detail line), **Amount** (right-aligned, bold).

| State | Detail line under the badge |
| --- | --- |
| Processing | — |
| Confirming | "Not confirmed yet." plus a small outline "Check again" button, disabled with "Checking…" while a Reconciliation run is active |
| Approved | "Auth. code {authorization_code}" |
| Declined | The short reason from the [outcome copy](#outcome-copy) |
| Failed | The short reason from the [outcome copy](#outcome-copy) |

**Empty**: "No top-ups yet." + "Top up with SnailPay to add funds. Every attempt shows up here, whatever its result."

### Simulation controls

`h3` "Simulation controls"; text "Turn this on to make SnailPay fail every payment, as if it had an internal problem. It affects everyone using this server." and a `Switch` labeled "SnailPay outage: {on|off}". It reads `GET /api/snailpay/outage` on mount and writes `PUT` on toggle.

- While reading or writing, the switch is disabled.
- If either call fails: an inline "Couldn't reach SnailPay. Try again." and the switch keeps its last known value.
- This is the UI path for the System error row of the README's Scenario table.

## Top-up dialog

A shadcn `Dialog` over the dashboard, at most 28 rem wide (full width minus 16 px on phones). Focus starts on "Amount".

- `h2` "Top up your balance"; subtitle "Paid through SnailPay, a simulated gateway. Use a test card; never a real one."
- Fields: "Amount (MXN)" (`inputmode="decimal"`, placeholder "0.00"), "Card number" (`inputmode="numeric"`, shown in groups of four, stripped before sending), "Expiry" (placeholder "MM/YY", the slash inserted as the User types) and "CVV" (placeholder "3 digits") side by side, "Name on card" (prefilled with the User's full name). Every card field has `autocomplete="off"`.
- Actions: outline "Cancel", primary "Top up {amount}" (just "Top up" while the amount is empty or invalid).
- **Test cards**: a closed `<details>` "Test cards" at the bottom: "All use expiry 12/26 and CVV 543." and one row per Scenario card. The numbers come from the `ScenarioCard` enum in `@snailrace/contracts` (the same values SnailPay echoes unmasked); the labels are web copy: "Approved", "Declined: insufficient funds", "Declined: security", "No answer in time (timeout)". The wrong expiry, wrong CVV and outage rows stay in the README.

**Field errors** (on blur and submit; the same rules as the API):

| Field | Error |
| --- | --- |
| Amount | "Enter an amount from $0.01 to $10,000.00." (also for more than two decimals) |
| Card number | "Enter the 16 digits of the card." |
| Expiry | "Use MM/YY." |
| CVV | "Enter 3 digits." |
| Name on card | "Enter the name on the card (up to 100 characters)." |

### States

| State | What shows |
| --- | --- |
| Server waking | Neutral alert with a spinner: "Waking up the server." + "This can take up to a minute." The submit button is disabled. |
| Server unreachable (health query failed) | `destructive` alert: "Can't reach the server." + "Check your connection." and a "Try again" button that refetches `['health']`. Submit stays disabled. |
| Processing | Neutral alert with a spinner: "Processing your payment…" + "You can close this window. The result will appear in your top-ups." Inputs read-only, the CVV masked as `•••`, submit busy "Processing…", "Cancel" becomes "Close". |
| Approved | The form is replaced by a receipt: success mark, `h2` "Payment approved", "+{amount}", "Added to your balance. New balance: {balance}", then a list with Card, Authorization code and Reference (first 8 and last 4 characters). One primary "Done" button. |
| Declined | The form stays filled. A `destructive` alert on top: "Declined: {title}" + "Your balance did not change. {action}". For the three `bad_filled` details, the matching field is also marked invalid with "Doesn't match this card." Submit reads "Try again"; pressing it is a **new** Top-up. |
| Failed | The form stays filled. A `destructive` alert with `TriangleAlert`: "{title}" + "{body}". Submit reads "Try again" (a new Top-up). |
| Confirming (Unknown) | The form is replaced by a panel: `warning` mark, `h2` "Confirming your payment", the amount in muted ink, "SnailPay didn't answer in time, so we're checking whether the payment went through. Your balance won't change until it's confirmed.", a spinner line "Checking… (attempt {n} of 5)" and an outline "Close, keep checking". When Reconciliation settles it, the panel swaps to the Approved receipt, or to the Declined or Failed alert over the form. |
| Not confirmed yet (run exhausted) | Same panel: `h2` "Not confirmed yet", "SnailPay hasn't confirmed this payment yet. Your balance hasn't changed. We'll check again when you come back, or you can check now." Buttons "Close" and primary "Check again". |

- **Closing** the dialog never cancels anything. A Processing or Confirming Top-up keeps going and settles in the history, with a toast.
- Reopening the dialog always shows a fresh, empty form (name prefilled). The history is where earlier results live.

## Outcome copy

One row per result the User can meet. The dialog shows **title + body**; the history shows the **short reason**; the toast shows its own title and "{amount} · {short reason}".

| Result | Outcome | Title | Body | Short reason |
| --- | --- | --- | --- | --- |
| `accredited` | Approved | Payment approved | Added to your balance. | Auth. code {code} |
| `cc_rejected_bad_filled_card_number` | Declined | Declined: card not recognized | Check the card number and try again. | Card not recognized |
| `cc_rejected_bad_filled_date` | Declined | Declined: wrong expiry date | Check the expiry date on the card. | Wrong expiry date |
| `cc_rejected_bad_filled_security_code` | Declined | Declined: wrong security code | Check the 3-digit code on the back of the card. | Wrong security code |
| `cc_rejected_insufficient_amount` | Declined | Declined: insufficient funds | The card doesn't have enough funds. Try a smaller amount or another card. | Insufficient funds |
| `cc_rejected_high_risk` | Declined | Declined for security reasons | SnailPay declined this payment to protect you. Use another card. | Declined for security |
| `service_unavailable` | Failed | SnailPay is unavailable | Nothing was charged and your balance did not change. Try again in a few moments. | SnailPay was unavailable |
| `rate_limited` | Failed | Too many attempts | Nothing was charged. Wait a minute and try again. | Too many attempts |
| `internal_error` | Failed | SnailPay couldn't process the payment | Nothing was charged and your balance did not change. Try again. | SnailPay error |
| `invalid_request`, `idempotency_key_reused` | Failed | Something went wrong with this payment | Nothing was charged. Try again. | Payment error |
| Lookup `404` after 2 minutes | Failed | Payment not found | SnailPay has no record of this payment, so nothing was charged. | No record at SnailPay |
| Timeout, network error, unreadable body | Confirming | Confirming your payment | (see the dialog states) | Not confirmed yet |

**Toasts**, fired in the tab that settles the Top-up (including Reconciliation on load):

| Outcome | Toast title |
| --- | --- |
| Approved | "Top-up approved" + "+{amount} added to your balance." |
| Declined | "Top-up declined" |
| Failed | "Top-up failed" |
| Confirming | "Payment not confirmed yet" + "{amount} · We're checking with SnailPay." |

## System screens

Both use the auth layout (centered column, no header actions).

- **Unreadable local data** (users or ledger fail their schema, [State and persistence](../specs/state-and-persistence.md)): `h1` "Your saved data can't be read"; "The data this browser keeps for Snailrace is damaged, so we won't guess your balance. Resetting removes every account and top-up saved in this browser."; primary "Reset local data", which removes every `snailrace.v1.*` key and goes to `/sign-in`.
- **Error boundary**: `h1` "Something went wrong"; "The page hit an unexpected error. Your balance and top-ups are safe in this browser."; primary "Reload".

## Left out

- A warning when signing out with a Processing Top-up ([Auth](../specs/auth.md#sign-out) keeps it running and the history shows it on the next sign-in).
- Showing the Outage state inside the Top-up dialog: the switch sits on the same screen.
