# Frontend stack

The libraries and patterns the React app uses, and why each one earns its place. Terms follow [`CONTEXT.md`](../../CONTEXT.md). The structure they fit into (feature folders, the `storage` module, `api/` wrappers) is fixed by [`architecture.md`](../architecture.md). This was decided in the ticket [Choose the frontend stack: routing, server-state, forms, UI kit and charts](https://github.com/TadeoOL/tadeo-5396/issues/13).

## Dependencies

| Concern           | Choice                                                                                      | Why it earns its place                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build and runtime | Vite 8 + React 19, from the official `react-ts` template with `@vitejs/plugin-react`        | A static SPA that Express serves from `dist`, as the architecture requires. The ESLint plugins in [`conventions.md`](../conventions.md) match this template.                              |
| Routing           | `react-router` 8, declarative mode                                                          | Four routes and two guards. The Session is reactive browser state, so the guards are components, not loaders.                                                                             |
| Server state      | `@tanstack/react-query` 5                                                                   | Per-key caching with `staleTime: Infinity`, as the [simulated data spec](simulated-data.md) requires, plus loading, error, dedupe and cancellation without custom code.                   |
| Local state       | None: React's `useSyncExternalStore`                                                        | The `storage` module is already the store. React only subscribes to it.                                                                                                                   |
| HTTP              | None: native `fetch` with `AbortSignal.timeout` and `AbortSignal.any`                       | The platform already covers the timeout and abort. The wrapper must tell a timeout apart from a network error, which [top-up reliability](top-up-reliability.md) depends on.              |
| Forms             | `react-hook-form` 7 + `@hookform/resolvers` (Zod 4)                                         | Zod schemas stay the single source of rules and error copy. RHF wires them to the inputs: touched state, focus on the first error, submit state and form-level errors.                    |
| UI kit            | shadcn/ui (CLI 4), Radix base (`radix-ui`), with Tailwind CSS 4 through `@tailwindcss/vite` | Accessible primitives (dialog focus trap, labels, roles) as code that lives in the repo, with no fixed look. The theme tokens are CSS variables that the visual-direction ticket defines. |
| Charts            | `recharts` 3, through shadcn's `Chart` component                                            | SVG, so it is accessible and styled by the same tokens. `accessibilityLayer` is on by default.                                                                                            |
| Toasts            | `sonner`, through shadcn's `Toaster`                                                        | A transient confirmation announced through `aria-live`.                                                                                                                                   |
| Icons             | `lucide-react`                                                                              | The icon set shadcn components already use.                                                                                                                                               |
| Font              | `@fontsource-variable/archivo` (the `wdth.css` axes file)                                  | Self-hosts the one typeface the [visual direction](../design/visual-direction.md#typography) uses, with its width axis, inside the default CSP.                                          |
| Lint (dev)        | `eslint-plugin-jsx-a11y`                                                                    | Catches accessibility mistakes in our own markup, which Radix does not cover. See [Accessibility](#accessibility).                                                                        |

Money and dates use `Intl.NumberFormat` (MXN) and `Intl.DateTimeFormat`. There is no date or money library. The client-local date that seeds the Race Day comes from `Date` in a small helper.

## Routing

- `<BrowserRouter>` with `<Routes>`. The routes and redirects are the table in the [auth spec](auth.md).
- Two layout routes guard the others:
  - `RequireSession` renders `<Outlet />` when a valid Session exists, and `<Navigate to="/sign-in" replace />` otherwise.
  - `PublicOnly` does the opposite and redirects to `/dashboard`.
- Both read the Session with `useSession()` (see [Local state](#local-state)), so a `storage` event from another tab or the expiry timer re-renders them and redirects at once.
- Rejected: **data mode** with a `redirect()` in a `loader`. Loaders run only on navigation, so they miss the `storage` event and the expiry timer, and component guards would still be needed. **TanStack Router** is a large dependency whose typed routes do not pay off for four routes.

## Server state

- **Race Day and Bets**: `useQuery` with the keys `['race-day', date]` and `['bets', date, userId]`, `staleTime: Infinity`, and a bounded `retry` for these idempotent GETs.
- **Health**: `useQuery` with the key `['health']`, mounted in the app shell. It gates the Top-up submit button while the server wakes up ([Deployment](../deployment.md#warm-up-in-the-ui)).
- **Charge**: `useMutation` with `retry: 0`. A payment is never retried generically. Every retry rule (the idempotency key, the write-ahead, Reconciliation and its backoff) belongs to [top-up reliability](top-up-reliability.md), which lives in the `top-up` feature.
- TanStack Query holds only data that comes from the server. The Balance, the ledger and the Session are not server state and never go through it.
- Rejected: **custom `fetch` hooks** with a `Map` cache, which would reimplement dedupe, loading and error state, cancellation on unmount, and invalidation. **SWR** has weaker mutations.

## Local state

- The Session, the Users and the ledgers live in localStorage behind the `storage` module (see [state and persistence](state-and-persistence.md)). React reads them with `useSyncExternalStore(storage.subscribe, getSnapshot)`, wrapped in small hooks such as `useSession()` and `useLedger(userId)`.
- **`getSnapshot` must return the same reference while the stored value is unchanged.** Cache the parsed value keyed by the raw string read from localStorage. Otherwise React sees a new object on every call and loops.
- Writes always go through `storage` functions (`startTopUp`, `settleTopUp`, …), never through React state.
- Rejected: **Zustand with the `persist` middleware.** `persist` writes the in-memory state to localStorage on every `set`, which breaks the read-modify-write rule. A concrete failure: tab A credits a Top-up of $100; tab B still holds `balanceCents: 0` in memory (`persist` does not listen to the `storage` event by default); tab B's next `set`, for example when it marks a `pending` Top-up as `unknown` on load, writes the ledger back with $0, and the Balance is lost. Zustand as a read-only mirror of `storage` would be safe, but it adds a dependency and a second copy of the state to get what `useSyncExternalStore` already gives. **TanStack Query over localStorage** mixes local state into the server cache.

## HTTP

- `web/src/api` holds one small `fetch` wrapper and the endpoint functions built on it. Features never call `fetch` directly.
- The wrapper:
  - Combines `AbortSignal.timeout(ms)` with the caller's signal (from TanStack Query) using `AbortSignal.any`. The Charge timeout is 10 s, set by [top-up reliability](top-up-reliability.md).
  - Parses every response body with its `@snailrace/contracts` schema before returning it.
  - Returns a typed result that tells apart: a parsed response (with its HTTP status), a timeout (`TimeoutError`), an abort by the caller (`AbortError`), a network error, and an unparseable body. Top-up reliability maps each one to an outcome.
- Rejected: **ky** would only contribute its timeout, and its automatic retry would have to be turned off for the Charge. **axios** is heavier and adds nothing here.

## Forms

- `useForm` with `zodResolver(schema)`, `mode: 'onBlur'` and `reValidateMode: 'onChange'`.
- **Auth**: the sign-up and sign-in schemas, with the rules and error copy from the [auth spec](auth.md), live in `features/auth/schemas.ts`. Nothing else defines those rules.
- **Top-up**: the form schema is built from the `@snailrace/contracts` primitives (amount limits and card formats), so the form and the API reject the same input. The form schema also converts the amount from pesos, as typed, to integer cents before the request is built.
- **Form-level errors** (duplicate email, "Invalid email or password.", the throttle countdown, storage write failures) use `setError('root', …)` and render in an element with `role="alert"`.
- Fields render with shadcn's `Field` components, which set `aria-invalid` and link the error with `aria-describedby`.
- Rejected: **controlled inputs with `useState`**, which would re-implement touched state, focus on the first error and submit state. **React 19 form actions** (`useActionState`), which validate only on submit and lose per-field validation on blur.

## UI kit and styling

- **shadcn/ui** components are copied into `apps/web/src/components/ui` by its CLI, then owned and edited like any other source file. The base is **Radix** (`radix-ui`): it is the most mature and best-documented shadcn base.
- **Tailwind CSS 4**, configured through `@tailwindcss/vite` and one CSS entry file. There is no `tailwind.config` file.
- The theme is a set of CSS variables. Their values (palette, type, radius) are in [`docs/design/tokens.css`](../design/tokens.css), explained in the [visual direction](../design/visual-direction.md).
- This choice must be declared in the response document, under tools, libraries and templates.
- Rejected: **Mantine**, which ties the app to its styling system and a recognizable look, with components outside the repo. **MUI**, which is heavy, looks like Material and adds a CSS-in-JS runtime. **Hand-written CSS Modules**, which would mean building an accessible dialog, focus management and toasts by hand; that does not fit the 6–8 h budget.

## Charts

- **Recharts 3** through shadcn's `Chart` component, for the donut (won vs lost Bets) and the bar chart (Wins per Snail). Colors come from the theme's chart tokens.
- **Each chart has a text summary** for screen readers, for example "7 won, 5 lost", computed from the same data. The exact wording belongs to the screens ticket.
- Rejected: **Chart.js**, which draws on a canvas: it is opaque to screen readers and ignores CSS tokens. **Hand-drawn SVG**, which would mean building tooltips, scales and accessibility for two charts.

## Notifications

- **Sonner** shows a transient confirmation for each Top-up outcome.
- **A toast is never the only place an outcome appears.** Every outcome also stays visible in the UI:
  - A Declined outcome shows inline in the Top-up form, with its `status_detail` mapped to an actionable message.
  - Every Top-up, whatever its outcome, stays in the Top-up history.

  A toast disappears, and a time limit on reading it is an accessibility problem (WCAG 2.2.1). The exact placement belongs to the screens ticket.

## Error boundary

A small class component in `app/` (about 15 lines) catches render errors and shows a fallback with a reload action. There is no `react-error-boundary` dependency for a single boundary.

## Accessibility

The target is **WCAG 2.2 AA**. The baseline:

- Semantic landmarks (`header`, `main`, `nav`) and exactly one `h1` per screen.
- Every input has a visible `label`. Field errors use `aria-invalid` and `aria-describedby`. Form-level errors use `role="alert"`.
- On every route change, `document.title` is updated and focus moves to the screen's `h1`.
- Everything works with the keyboard, and focus is always visible. The Top-up dialog uses Radix's focus trap and returns focus to its trigger when it closes.
- Animations respect `prefers-reduced-motion`.
- The theme tokens meet AA contrast. The visual-direction ticket checks this.
- Charts have text summaries (see [Charts](#charts)), and outcomes are never shown only in a toast (see [Notifications](#notifications)).

**Enforcement:** `eslint-plugin-jsx-a11y` (flat config, `recommended`) runs in the frontend lint (see [`conventions.md`](../conventions.md)). axe runs in the end-to-end specs, not in component tests ([Testing](../testing.md)).

## Handoffs

- **Visual direction and design tokens**: decided in the [visual direction](../design/visual-direction.md).
- **Screens**: place the inline outcome, the history, the toasts and the chart summaries; write their copy.
- **Testing strategy**: decided in [Testing](../testing.md).
- **Implementation roadmap**: the first frontend issue runs the shadcn CLI init for Vite and adds `Field`, `Chart`, `Sonner` and `Dialog`.
