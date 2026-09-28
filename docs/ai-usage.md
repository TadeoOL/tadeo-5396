# AI usage log

Every working session appends one entry: tool, purpose, what it produced, and how the output was validated. This log feeds the "AI usage" section of the final response document.

## 2026-09-28 — Requirements intake and repository setup

- **Tool**: Claude Code (Claude Opus 5.5).
- **Purpose**: turn the PDF requirements brief into a local Markdown file, and set up the repository.
- **Produced**: a local, gitignored Markdown copy of the brief; `git init`, `.gitignore`, the public GitHub repository, and the repo-local Git identity.
- **Validation**: not recorded at the time; the maintainer should confirm how the transcription was checked against the PDF.

## 2026-09-28 — Planning map (wayfinder) and research

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; three research subagents with web access; GitHub CLI.
- **Purpose**: turn the brief into a planning map of decision tickets that ends in an implementation-ready blueprint, and resolve the research tickets that the first decisions depend on.
- **Produced**:
  - The map issue and its 18 child tickets, with blocked-by dependencies, labels and milestones.
  - Three research write-ups on `research/*` branches, covering payment gateway conventions, browser password hashing, and free hosting options.
  - Pointer comments on downstream tickets that are affected by the research.
- **Validation**:
  - The maintainer chose the destination, scope and depth through a question round, and approved the ticket list before it was created.
  - The research write-ups cite primary sources (official docs, OWASP, NIST, pricing pages).
  - The password-hashing reference code was type-checked and run under Node and Vitest by the research agent.
  - The maintainer has not reviewed the research write-ups yet; each one will be checked when the ticket that depends on it is worked.

## 2026-09-28 — Domain model and glossary

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills.
- **Purpose**: resolve the ticket "Define the domain model and ubiquitous language".
- **Produced**: the `CONTEXT.md` glossary and the ticket's resolution comment.
- **Validation**:
  - Over two question rounds, each term and rule was put to the maintainer with a recommendation, and the maintainer accepted each one explicitly.
  - The maintainer confirmed the final glossary before it was committed.

## 2026-09-28 — State ownership and persistence

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills.
- **Purpose**: resolve the ticket "Decide state ownership and persistence between browser and server".
- **Produced**:
  - `docs/specs/state-and-persistence.md`.
  - `docs/adr/0001-browser-as-ledger.md`.
  - The "Pending" term in `CONTEXT.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Over two question rounds, ten decisions were put to the maintainer with a recommendation, and the maintainer accepted each one.
  - The maintainer confirmed the summary before any file was written.
  - The decisions were cross-checked against the requirements brief and the research write-ups on payment gateways and hosting.

## 2026-09-28 — Simulated race-day and bet data

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills.
- **Purpose**: resolve the ticket "Specify simulated race-day and bet data: generation, congruence and caching".
- **Produced**:
  - `docs/specs/simulated-data.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Over two question rounds, eleven decisions were put to the maintainer with a recommendation, and the maintainer accepted each one.
  - The maintainer confirmed the summary before any file was written.
  - The spec was cross-checked against the glossary and the state-and-persistence spec: Race Days and Bets are not persisted, and the `userId` is a UUID.

## 2026-09-28 — Engineering conventions

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Set engineering conventions: Git workflow, commits, linting, formatting and CI".
- **Produced**: `docs/conventions.md` and the ticket's resolution comment.
- **Validation**:
  - Before asking anything, the agent checked the facts behind each question: the local toolchain versions, the existing commit history, and the repository's merge and branch-protection settings.
  - Over two question rounds, ten decisions were put to the maintainer with a recommendation, and the maintainer accepted each one.

## 2026-09-28 — System architecture

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling`, `domain-modeling` and `codebase-design` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Define the system architecture: monorepo layout, layering and shared contracts".
- **Produced**:
  - `docs/architecture.md`, with a component diagram.
  - `docs/adr/0002-run-typescript-with-node-type-stripping.md`.
  - The commit scope list in `docs/conventions.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Before asking, the agent built a throwaway npm workspace and confirmed that Node 24.15 runs a `.ts` file imported from a symlinked workspace package.
  - Over two question rounds, nine decisions were put to the maintainer with a recommendation, and the maintainer accepted each one.
  - The maintainer confirmed the summary before any file was written.

## 2026-09-28 — Auth simulation

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Specify the auth simulation: password storage, session lifecycle and route guarding".
- **Produced**:
  - `docs/specs/auth.md`.
  - Updates to `docs/specs/state-and-persistence.md` (the Session and throttle keys) and to `docs/architecture.md` (the throttle key in the storage module).
  - A sharper definition of Session in `CONTEXT.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Eight decisions were put to the maintainer one at a time, each with a recommendation, and the maintainer accepted each one.
  - The maintainer questioned the agent's first recommendation against sign-in rate limiting. The agent revised it after weighing the cost (under an hour, one extra key) against the value, and the maintainer accepted the revised version.
  - The decisions were cross-checked against the requirements brief, the password-hashing research write-up, and the state-and-persistence spec.

## 2026-09-28 — SnailPay API contract

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Define the SnailPay API contract and scenario catalog".
- **Produced**:
  - `docs/specs/snailpay-api.md`, including the seed of the Scenario reproduction table.
  - The "Outage" term in `CONTEXT.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Nine decisions were put to the maintainer one at a time, each with a recommendation, and the maintainer accepted each one. Three minor gaps were filled with stated defaults that the maintainer approved.
  - The maintainer confirmed the summary before any file was written.
  - The contract was cross-checked against the requirements brief, the payment-gateway research (the mandated card fails Luhn and `12/26` expires), the state-and-persistence spec and the architecture document.

## 2026-09-28 — Top-up reliability

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Design top-up reliability: idempotency, timeouts, retries and async processing".
- **Produced**:
  - `docs/specs/top-up-reliability.md`, with sequence diagrams.
  - The conditional `429 rate_limited` entry and the client timeout in `docs/specs/snailpay-api.md`; the restart rule in `docs/specs/state-and-persistence.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Eight decisions were put to the maintainer one at a time, each with a recommendation, and the maintainer accepted each one.
  - The agent widened one accepted rule before writing (any unparseable body, not only 2xx/4xx, maps to Unknown, to cover proxy `502`/`504` pages), and the maintainer confirmed the summary that included it.
  - The design was cross-checked against the SnailPay contract (the Charge is stored before the 30 s delay), the ledger write rules and the hosting research (about one minute of cold start).

## 2026-09-28 — Frontend stack

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI; Context7 for current React Router and shadcn/ui docs; `npm view` for current versions.
- **Purpose**: resolve the ticket "Choose the frontend stack: routing, server-state, forms, UI kit and charts".
- **Produced**:
  - `docs/specs/frontend-stack.md`.
  - The `eslint-plugin-jsx-a11y` entry in `docs/conventions.md` and a link from `docs/architecture.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Ten decisions were put to the maintainer one at a time, each with a recommendation.
  - The maintainer proposed Zustand for local state. The agent checked it against the read-modify-write rule in the state-and-persistence spec, showed a two-tab scenario in which the `persist` middleware loses Balance, and offered a safe read-only variant. The maintainer then chose `useSyncExternalStore`.
  - The agent checked library versions and modes before recommending them (React Router 8 keeps declarative mode; shadcn's `Chart` uses Recharts 3). The stack was cross-checked against the top-up reliability spec, which landed during the session (10 s `AbortSignal.timeout`, no automatic `POST` retry).

## 2026-09-28 — Security baseline

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI; a read-only subagent that mapped every security-relevant commitment in the existing specs.
- **Purpose**: resolve the ticket "Set the security baseline for the simulation and card-data handling".
- **Produced**:
  - `docs/specs/security.md`: threat model, implemented measures, documented-only limits.
  - Card masking for non-catalog numbers and hash-based payload comparison in `docs/specs/snailpay-api.md`; related links in `state-and-persistence.md`, `top-up-reliability.md`, `architecture.md` and `conventions.md` (`npm audit` step, `dangerouslySetInnerHTML` lint ban).
  - The ticket's resolution comment.
- **Validation**:
  - The subagent's map surfaced gaps the specs had left open: any 16-digit number was echoed and stored verbatim, the `X-Request-Id` header was unvalidated, and there was no body limit or rate limiter.
  - Six decisions were put to the maintainer in one round, each with a recommendation, and the maintainer accepted all of them. The agent added the lint ban and confirmed it in the summary before writing.
  - While writing, the agent found that masking the stored card would break the "same key, different payload" check if it compared stored fields, so the spec compares a hash of the normalized request instead.

## 2026-09-28 — Testing strategy

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling`, `domain-modeling` and `tdd` skills; GitHub CLI; a research subagent with web and Context7 access; `npm view` for current versions.
- **Purpose**: resolve the ticket "Define the testing strategy: what to test at each layer and why".
- **Produced**:
  - `docs/testing.md`, with the requirement → test map.
  - The test scripts and end-to-end CI steps in `docs/conventions.md`; the HTTP-level testing note and the rate-limiter-per-app rule in `docs/architecture.md`; the axe and testing handoffs in `docs/specs/frontend-stack.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Twelve decisions were put to the maintainer one at a time, each with a recommendation, and the maintainer accepted each one and confirmed the final summary.
  - The research subagent ran its tool claims in a scratch project (Vitest 5.0.2, jsdom, happy-dom, Supertest 7 with Express 5) instead of trusting docs. It found three facts that shaped the rules: jsdom's cross-realm bytes, fake timers not faking `AbortSignal.timeout`, and Testing Library hanging under fake timers.
  - The agent measured PBKDF2 at 600k iterations in Node 24 (about 75 ms per hash) before recommending real iterations in tests.
  - The strategy was cross-checked against the security baseline, which landed during the session: it adds masking and `429` tests, and it requires the rate limiter to be created inside `createApp`, or the suite would trip it.
