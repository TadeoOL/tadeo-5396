# Roadmap

The implementation roadmap: GitHub issues labelled `roadmap` or `review`, in four milestones. Each issue is one pull request. Its body lists what to read, the files and signatures to create, the tests that prove it, and what is out of scope. Blocking uses GitHub's native dependencies ("Blocked by").

How agents pick, claim and work an issue is in [`AGENTS.md`](../AGENTS.md). Labels:
- `roadmap`: an implementation issue.
- `review`: a milestone review, run by the reviewer agent.
- `hitl`: needs the human.
- `needs-high` and `needs-human`: an attempt stopped, and the label says who picks it up next.

An Orca automation runs the three development milestones. Every 5 minutes it checks for takeable issues and launches one agent per issue, up to three at a time, each in its own worktree. It stops itself when every issue in those milestones is closed. Deployment and delivery (the Delivery milestone) are driven by the human.

Each review blocks the whole next milestone. It checks the milestone's work against its issues, the specs and the contracts, fixes severe findings, and updates the next milestone's issues to match the code.

## Minimum valid delivery

Sign up, sign out, sign in and a protected screen, running locally.

| Issue | Blocked by | Labels |
|---|---|---|
| #22 [Set up the workspace, the API and CI](https://github.com/TadeoOL/tadeo-5396/issues/22) | — | `roadmap` |
| #23 [Bootstrap the walking skeleton](https://github.com/TadeoOL/tadeo-5396/issues/23) | #22 | `roadmap` |
| #24 [Keep Users and the Session in the browser](https://github.com/TadeoOL/tadeo-5396/issues/24) | #23 | `roadmap` |
| #25 [Sign up and land on the protected dashboard](https://github.com/TadeoOL/tadeo-5396/issues/25) | #24 | `roadmap` |
| #26 [Sign out and sign back in](https://github.com/TadeoOL/tadeo-5396/issues/26) | #25 | `roadmap` |
| #27 [Review milestone: Minimum valid delivery](https://github.com/TadeoOL/tadeo-5396/issues/27) | #22, #23, #24, #25, #26 | `review` |

## Top-ups

SnailPay and the Top-up flow with every outcome.

| Issue | Blocked by | Labels |
|---|---|---|
| #28 [SnailPay: create Charges for every Scenario](https://github.com/TadeoOL/tadeo-5396/issues/28) | #27 | `roadmap` |
| #29 [SnailPay: look Charges up and switch the Outage](https://github.com/TadeoOL/tadeo-5396/issues/29) | #28 | `roadmap` |
| #30 [Settle Top-ups in the ledger from SnailPay results](https://github.com/TadeoOL/tadeo-5396/issues/30) | #28 | `roadmap` |
| #31 [Top up with the approval card](https://github.com/TadeoOL/tadeo-5396/issues/31) | #30 | `roadmap` |
| #32 [Hold the Top-up until the server is awake](https://github.com/TadeoOL/tadeo-5396/issues/32) | #31 | `roadmap` |
| #33 [Show declines, failures and the Top-up history](https://github.com/TadeoOL/tadeo-5396/issues/33) | #29, #32 | `roadmap` |
| #34 [Confirm unknown Top-ups with Reconciliation](https://github.com/TadeoOL/tadeo-5396/issues/34) | #33 | `roadmap` |
| #35 [Review milestone: Top-ups](https://github.com/TadeoOL/tadeo-5396/issues/35) | #28, #29, #30, #31, #32, #33, #34 | `review` |

## Race-day charts and recovery

Race-day data, the dashboard charts and the recovery screens. Local development ends when its review closes.

| Issue | Blocked by | Labels |
|---|---|---|
| #36 [Serve the race-day data](https://github.com/TadeoOL/tadeo-5396/issues/36) | #35 | `roadmap` |
| #37 [Chart the Race Day on the dashboard](https://github.com/TadeoOL/tadeo-5396/issues/37) | #36 | `roadmap` |
| #38 [Recover from unreadable local data and render errors](https://github.com/TadeoOL/tadeo-5396/issues/38) | #35 | `roadmap` |
| #39 [Review milestone: Race-day charts and recovery](https://github.com/TadeoOL/tadeo-5396/issues/39) | #36, #37, #38 | `review` |

## Delivery

Deployment, the README and hygiene pass, and the response document. Human-driven.

| Issue | Blocked by | Labels |
|---|---|---|
| #40 [Deploy to Render](https://github.com/TadeoOL/tadeo-5396/issues/40) | #39 | `roadmap`, `hitl` |
| #41 [Finalize the README and run the hygiene pass](https://github.com/TadeoOL/tadeo-5396/issues/41) | #40 | `roadmap`, `hitl` |
| #42 [Write the response document](https://github.com/TadeoOL/tadeo-5396/issues/42) | #41 | `roadmap`, `hitl` |

## Coverage

Every capability the app must deliver, with the issues that build it.

| Capability | Issues |
|---|---|
| Register with full name, email, password and confirmation | #24, #25 |
| Sign out, sign back in, and keep data after a reload | #24, #26 |
| A protected screen that needs an active Session | #25 |
| Password handling and storage | #24 |
| A Balance that starts at $0 and persists in localStorage | #25, #30 |
| Dashboard: the User's name, the Balance and sign-out | #25, #26 |
| Dashboard: a donut of won/lost Bets and a bar chart of wins per Snail (6 Snails, 6 Races) | #36, #37 |
| SnailPay mock: the request fields, the nine response fields and the approval card | #28, #30, #31 |
| Transaction errors with a useful `status_detail` | #28, #33 |
| A documented way to simulate a system error | #29, #33 |
| Timeouts and unknown outcomes, with no false success and no double credit | #30, #34 |
| Fictitious card data in responses and in localStorage | #28, #31 |
| Unreadable local data and render errors | #38 |
| Automated tests, organized by risk | #22, #23, #26, #31 |
| Instructions to run, test and reproduce every SnailPay response | #22, #28, #41 |
| Public deployment (optional deliverable) | #40 |
| Database proposal (optional deliverable): already written in `docs/db-proposal.md` | #42 |
| Response document, AI usage and design declaration | #42 |
