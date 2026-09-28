# AI usage log

Every working session appends one entry: tool, purpose, what it produced, how the output was validated, and the time spent. This log feeds the "AI usage" section of the final response document.

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

## 2026-09-28 — Deployment topology

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI; a research subagent with web access that checked Render's docs.
- **Purpose**: resolve the ticket "Decide the deployment topology and environment configuration".
- **Produced**:
  - `docs/deployment.md`: the Render Blueprint, build and start commands, environment, static serving, the proxy hop measurement, auto-deploy and the review-window freeze, keep-alive and UI warm-up, in-memory state caveats, the first-deploy checklist and the response-document outline.
  - Related edits in `docs/specs/security.md` (measured `trust proxy`), `docs/architecture.md`, `docs/conventions.md`, `docs/testing.md`, `docs/specs/top-up-reliability.md` and `docs/specs/frontend-stack.md`.
  - The ticket's resolution comment.
- **Validation**:
  - Eight decisions were put to the maintainer in one round, each with a recommendation, and the maintainer accepted all of them.
  - The subagent's findings changed two recommendations before the answer: Render already sets `NODE_ENV=production` at runtime, so it is not set in the Blueprint; and Render does not document its proxy hop count (Cloudflare plus its load balancer), so the security baseline's `trust proxy: 1` became a value measured on the first deploy.
  - Facts the docs leave open (whether the build sees service variables, what a `fetch` gets during spin-up, whether a Blueprint asks for a card) are marked as such, and each has a fallback that works either way.

## 2026-09-28 — Database proposal

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Draft the database proposal for the optional deliverable".
- **Produced**:
  - `docs/db-proposal.md`, with a Mermaid ERD.
  - The ticket's resolution comment.
- **Validation**:
  - Eight decisions were put to the maintainer one at a time, each with a recommendation, and the maintainer accepted each one.
  - The maintainer asked whether a database contradicts the brief's localStorage requirement. The agent checked the brief: the requirement covers the delivered app, and the optional task asks for a proposal that is not implemented. So the document opens by stating that, and it calls out that the card and CVV kept in localStorage are an artifact of the simulation.
  - The brief bans code in the response PDF, so the proposal describes its constraints in prose and contains no DDL.

## 2026-09-28 — Visual direction and design tokens

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder` and `impeccable` skills; the `impeccable` direction roll and decision page; Playwright for screenshots; GitHub CLI.
- **Purpose**: resolve the ticket "Set the visual direction and design tokens".
- **Produced**:
  - `PRODUCT.md`: the product record the design skill reads, taken from the brief and `CONTEXT.md`.
  - `docs/design/visual-direction.md`, `docs/design/tokens.css` and `docs/design/prototype.html`.
  - Related edits in `docs/specs/frontend-stack.md` (the font dependency and links to the tokens).
  - The ticket's resolution comment.
- **Validation**:
  - The maintainer chose a lightweight process (no generated comps, no full build), confirmed that the design speaks to a fictional snail-racing fan, and picked the Jockey Silks direction on a decision page that also showed the Tote Board lead, a split-flap challenger, five declined challengers and the plain shadcn look.
  - Every token pair was checked with a WCAG contrast script. One silk (Nacho's gold, 1.63:1 on white) fails the 3:1 non-text minimum on its own, so every silk shape carries an ink outline, and the document records the exception.
  - The prototype was captured at 1280 px and 390 px wide. The mobile capture showed a horizontal overflow in the Top-up dialog, which was fixed and captured again. The skill's anti-pattern detector reported no findings.
  - The Archivo package was inspected to confirm that its `wdth.css` file exposes the width axis under the family name the tokens use.

## 2026-09-28 — Delivery package

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; GitHub CLI.
- **Purpose**: resolve the ticket "Plan the delivery package: README, scenario table, response-document outline and hygiene pass".
- **Produced**:
  - `docs/delivery.md`: README sections, the canonical home of the Scenario table, the response-document format and outline, the hygiene pass and the two roadmap closing issues.
  - The `Time` line in this log's entry format.
  - The ticket's resolution comment.
- **Validation**:
  - Eight decisions were put to the maintainer in one round, each with a recommendation, and the maintainer accepted all of them.
  - Before asking, the agent checked the history of every branch, the commit messages and the issues for references to the organization, and confirmed the brief was never tracked. All came back clean.
- **Time**: about 15 minutes.

## 2026-09-28 — Screens

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder` skill; Playwright for screenshots; GitHub CLI.
- **Purpose**: resolve the ticket "Design the screens: auth, dashboard and top-up flow with every state".
- **Produced**:
  - `docs/design/screens.md`: layout, states and final copy for sign-in, sign-up, the dashboard, the Top-up dialog and the system screens, plus the outcome copy for every `status_detail`.
  - `docs/design/screens-prototype.html`: a gallery of every state in desktop and phone frames.
  - Related edits: the outcome-label note in `docs/design/visual-direction.md` and the `ScenarioCard` enum in `docs/architecture.md`.
  - The ticket's resolution comment.
- **Validation**:
  - The agent derived every state from the auth, top-up reliability, SnailPay and deployment specs, built the prototype with its recommended defaults, and put the three real forks to the maintainer one at a time: the Outage switch on the dashboard, user-facing outcome labels instead of domain terms, and a test-card list in the dialog. The maintainer accepted all three.
  - The agent first suggested a constant in `contracts`, then checked the architecture document, confirmed it allows constants, and chose a `z.enum` that SnailPay's masking rule also uses.
  - The prototype was captured with Playwright at 1300 px to check the dashboard and dialog panels.
- **Time**: about 25 minutes.

## 2026-09-28 — Implementation roadmap and agent loop

- **Tool**: Claude Code (Claude Opus 5.5) with the `wayfinder`, `grilling` and `domain-modeling` skills; four drafting subagents (one per milestone plus a sample), a research subagent with web access, and a Claude Code docs subagent; GitHub CLI; Orca.
- **Purpose**: resolve the ticket "Slice the implementation roadmap into agent-sized issues", and set up the agents and the automation that build the app.
- **Produced**:
  - 21 GitHub issues (#22–#42) in four milestones: 15 implementation issues, 3 milestone reviews and 3 human-driven delivery issues. They have native blocked-by dependencies and the labels `roadmap`, `review`, `hitl`, `needs-high` and `needs-human`.
  - `docs/roadmap.md`: the index and the coverage table.
  - `AGENTS.md`: the shared agent instructions (docs map, commands, how to pick and claim an issue, worktrees and ports for parallel agents, reporting findings, and the Definition of done).
  - `.claude/agents/implementer.md`, `implementer-high.md` and `reviewer.md`: Opus 5.5 at low, high and xhigh effort.
  - Spec corrections found while drafting: the SnailPay `500` body, the multi-tab storage filter, `HealthResponse`, the write-ahead failure copy, the component install list, README Status per issue, and the Scenario table's home.
  - A local Orca automation (not in the repository) that runs the loop every 5 minutes and stops itself when local development is done.
- **Validation**:
  - The maintainer decided every structural choice in grilling rounds: vertical slices, the review gates, the issue template, the agent models, and splitting oversized issues.
  - The implementer model was chosen from published benchmark data: Opus 5.5 at low effort with escalation, instead of Sonnet 5 at high effort.
  - The maintainer reviewed a sample issue before the rest were drafted.
  - The drafting subagents prototyped the risky library behavior in scratch projects: the toolchain versions, Express 5, zod 4, Recharts and shadcn.
  - Every doc anchor in the issues was checked, and the issues were scanned for any reference to the requirements' origin.
- **Time**: about 4 hours.

## 2026-09-28 — Workspace, API and CI bootstrap

- **Tool**: Claude Code (Claude Opus 5.5), implementer agent.
- **Purpose**: implement roadmap issue #22, "Set up the workspace, the API and CI".
- **Produced**: the npm workspaces, `@snailrace/contracts`, the Express API with the health check and base middleware, the Vitest and Playwright setup, the `ci` workflow, the PR template, the README and the `main` ruleset.
- **Validation**: `npm run check`, `npm run build && npm run test:e2e`, manual `curl` of `/api/health` against `npm run dev`, the `ci` check on the PR, and `gh api` reads of the ruleset and merge settings.
- **Time**: about 30 minutes.

## 2026-09-28 — Walking skeleton

- **Tool**: Claude Code (Claude Opus 5.5), implementer agent.
- **Purpose**: implement roadmap issue #23, "Bootstrap the walking skeleton".
- **Produced**: the `@snailrace/web` Vite and React app with the app shell header, the shadcn/ui kit adapted to the design tokens, the `web` Vitest project, the React ESLint blocks, the root `dev` script with `concurrently`, two end-to-end tests with axe, and the README run sections.
- **Validation**: `npm run check`, `npm run build && npm run test:e2e` on a random port, `curl` of `/api/health` through the Vite proxy on custom ports, and a Playwright script on `npm start` checking the CSP header, the SPA fallback and an empty console.
- **Time**: about 20 minutes.

## 2026-09-28 — Users and the Session in the browser

- **Tool**: Claude Code (Claude Opus 5.5), implementer agent.
- **Purpose**: implement roadmap issue #24, "Keep Users and the Session in the browser".
- **Produced**: the web `storage` module (backend seam, in-memory `Storage`, change subscription, Users registry, Session with `useSession`), the sign-up schemas, the PBKDF2 credential and `signUp`, each with Vitest suites over an in-memory backend.
- **Validation**: `npm run check` and `npx vitest run --project web` (about 1 s with the real 600,000 iterations), and the `ci` check on the PR.
- **Time**: about 15 minutes.

## 2026-09-28 — Sign-up and the protected dashboard

- **Tool**: Claude Code (Claude Opus 5.5), implementer agent.
- **Purpose**: implement roadmap issue #25, "Sign up and land on the protected dashboard".
- **Produced**: the sign-up screen and form, the sign-in placeholder, the route guards, the dashboard greeting and Balance, the shared `ScreenTitle`, `AuthLayout`, `TextField` and `FormAlert`, `formatMxn`, their Vitest suites, and the README Status section.
- **Validation**: `npm run check`, `npm run build && npm run test:e2e`, a Playwright script against `npm run dev` for the manual criteria, and the `ci` check on the PR.
- **Time**: about 20 minutes.

## 2026-09-28 — Sign-out and sign-in

- **Tool**: Claude Code (Claude Opus 5.5), implementer agent.
- **Purpose**: implement roadmap issue #26, "Sign out and sign back in".
- **Produced**: the per-email throttle, `signInSchema` and `signIn`, the sign-in form with the invalid, locked and expired states, the header's "Sign out", end-to-end spec 1 with its helpers (replacing the smoke spec), their Vitest suites, and the README Status line.
- **Validation**: `npm run check`, `npm run build && npm run test:e2e`, a Playwright script for the manual criteria (narrow header, live countdown, `lockCount: 1`), and the `ci` check on the PR.
- **Time**: about 15 minutes.

## 2026-09-28 — Review of the "Minimum valid delivery" milestone

- **Tool**: Claude Code (Claude Opus 5.5), reviewer agent.
- **Purpose**: run review issue #27 over the milestone's five issues (#22–#26).
- **Produced**: the review report on #27, and a fix to `docs/specs/frontend-stack.md#forms`, which described two mechanisms the code does not use (the throttle countdown as a root form error, and shadcn's `Field` wiring `aria-invalid` and `aria-describedby`).
- **Validation**: read every issue, PR and changed file in the range against the specs; `npm run check`, `npm run build && npm run test:e2e`; `curl` of the production server's headers and request log; the dev proxy on custom ports; a Playwright script for every manual criterion (redirects, back button, stored Credential and Session, two tabs, sign-out, the lock countdown, the expired Session notice, an empty console); and the `ci` check on the PR.
- **Time**: about 1 hour.
