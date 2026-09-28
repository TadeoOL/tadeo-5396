# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite 8 SPA served by Express, with shadcn/ui (Radix) + Tailwind CSS 4, Recharts 3 and Sonner. Decided in [`docs/specs/frontend-stack.md`](docs/specs/frontend-stack.md).

## Users

A fictional snail-racing fan (a User, in [`CONTEXT.md`](CONTEXT.md) terms) who checks how the day's races went, how their simulated Bets did, and tops up their Balance. The design speaks to this fan first, as if the app were a real product for them. Reviewers of the project walk the app playing this role.

## Product Purpose

Let a User sign up, sign in, see their Balance and the simulated Race Day at a glance (Wins per Snail, won vs lost Bets), and add funds through SnailPay, a mock payment gateway, with every Top-up outcome (Credited, Declined, Failed, Unknown) communicated clearly. Success: a User always knows their Balance and what happened to each Top-up.

## Positioning

A snail-racing fan's home screen, where the race-day charm and a trustworthy money flow share the same screen. Betting and races are simulated; the money flow is simulated too, but it behaves like a real payment integration (idempotency, timeouts, Reconciliation).

## Operating Context

- Four routes: sign up, sign in, dashboard, and the Top-up flow (a dialog over the dashboard).
- Used on desktop and phone browsers. The deployment may cold-start, so a health check gates the Top-up button.
- Several Users can share one browser; each sees only their own Balance and history.

## Capabilities and Constraints

- Six Snails: Comet, Mossback, Pepper, Drizzle, Nacho and Sprinkles, always in that order. Six Races per Race Day.
- Required on the dashboard: the User's name, the Balance, a donut of won vs lost Bets, a bar chart of Wins per Snail, the Top-up action and sign out.
- There is no betting UI and no race execution; Bets carry no amount.
- Money is MXN with cents, formatted with `Intl.NumberFormat`.
- Card data is always fictitious; the UI masks it as `•••• 1234` and never shows the CVV.

## Brand Commitments

None beyond the domain vocabulary in `CONTEXT.md`. No real organization's name, logo or branding may appear anywhere.

## Evidence on Hand

Only simulated data: the deterministic Race Day and Bets generator ([`docs/specs/simulated-data.md`](docs/specs/simulated-data.md)) and the SnailPay Scenarios ([`docs/specs/snailpay-api.md`](docs/specs/snailpay-api.md)). There are no real users, testimonials or statistics, and none may be invented.

## Product Principles

- The money is never ambiguous: the Balance and every Top-up outcome are always visible in the UI, never only in a transient toast.
- Charm lives in the racing, not in the payment flow: the Top-up flow stays plain and trustworthy.
- Simulated means labeled: nothing pretends to be real money or a real race.

## Accessibility & Inclusion

WCAG 2.2 AA: AA contrast for every token pair, visible focus, keyboard operation, `prefers-reduced-motion`, and a text summary for every chart. See [Accessibility](docs/specs/frontend-stack.md#accessibility).
