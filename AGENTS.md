# AGENTS.md

Shared instructions for every coding agent in this repository.

## What this is

A small web app for betting on simulated snail races: Users sign up, follow a simulated Race Day and top up their Balance through SnailPay, a mock payment API, while the browser keeps the ledger in localStorage. The app is not built yet; the roadmap in GitHub issues builds it, and [`docs/roadmap.md`](docs/roadmap.md) is the index.

## Docs map

- `CONTEXT.md`: the domain glossary. Use its terms in code, tests and copy.
- `docs/adr/`: architecture decisions (the browser as ledger; TypeScript run through Node's type stripping).
- `docs/specs/auth.md`: sign-up, sign-in, throttle, Session and route guards.
- `docs/specs/frontend-stack.md`: frontend libraries and patterns.
- `docs/specs/security.md`: the security baseline and its documented limits.
- `docs/specs/simulated-data.md`: Race Day and Bets generation, endpoints and caching.
- `docs/specs/snailpay-api.md`: SnailPay routes, Scenarios, response shape, idempotency and Outage.
- `docs/specs/state-and-persistence.md`: localStorage keys, ledger write rules and multi-tab consistency.
- `docs/specs/top-up-reliability.md`: timeouts, retries and Reconciliation.
- `docs/design/screens.md`: layout, states and final copy of every screen.
- `docs/design/visual-direction.md`: the look, the tokens explained, kit versus custom components.
- `docs/design/tokens.css`: the theme tokens for the web CSS entry.
- `docs/architecture.md`: packages, layering, shared contracts, configuration, errors and logging.
- `docs/conventions.md`: Git workflow, commits, pull requests, code style, toolchain and CI.
- `docs/testing.md`: test tiers, tools, seams, rules and the requirement map.
- `docs/deployment.md`: hosting, serving the build and cold starts.
- `docs/delivery.md`: README sections, the Scenario table and the hygiene pass.
- `docs/db-proposal.md`: the database proposal (not implemented).
- `docs/ai-usage.md`: the AI usage log, one entry per session.
- `docs/roadmap.md`: the index of the roadmap issues.

The docs are the source of truth. Read only the sections your issue links.

## Commands

Node 24 (`.nvmrc`) and npm. Install with `npm ci`. These root scripts exist once the bootstrap issue lands:

| Script | What it does |
|---|---|
| `npm run dev` | Runs the API (port 3000) and Vite (port 5173) together; Vite proxies `/api`. |
| `npm run build` | Builds `web` with Vite. `api` and `contracts` run as TypeScript source. |
| `npm start` | Starts the API, which also serves `apps/web/dist`. |
| `npm run typecheck` | Type-checks every package. |
| `npm run lint` | Runs ESLint. |
| `npm run format` | Formats files with Prettier. |
| `npm run format:check` | Runs `prettier --check`. |
| `npm test` | Runs the Vitest suites once (`npx vitest run --project web` for one project). |
| `npm run test:watch` | Runs Vitest in watch mode. |
| `npm run test:e2e` | Runs Playwright against the build. Needs `npm run build` and a one-time `npx playwright install chromium`. |
| `npm run check` | Runs `typecheck`, `lint`, `format:check` and `test`. |

## Pick an issue

The next issue is the open, unassigned `roadmap` or `review` issue that is not blocked and has neither `hitl` nor `needs-human`, in the lowest milestone, with the lowest number. An assignee means another agent owns it. The label picks the agent: `review` → reviewer, `needs-high` → implementer-high, otherwise implementer.

```sh
gh issue list --repo TadeoOL/tadeo-5396 --state open --search "no:assignee -is:blocked -label:hitl -label:needs-human" --json number,title,labels,milestone
gh api repos/TadeoOL/tadeo-5396/issues/<n>/dependencies/blocked_by --jq '.[] | select(.state=="open") | .number'
```

Keep only `roadmap` and `review` issues from the first list. The second command must print nothing, which means the issue is unblocked.

## Claim and keep the issue updated

1. **Claim before any work**: `gh issue edit <n> --add-assignee @me`, then comment `Claimed. Worktree: <path>. Branch: <branch>.`
2. **Read the comments**: they can hold notes that other agents left for this issue. Treat them as part of the issue.
3. **Update**: comment with the PR link when it opens. The PR's `Closes #<n>` closes the issue on merge.
4. **Stopping without finishing**: comment the exact reason, remove yourself (`--remove-assignee @me`) and add a label. Use `needs-high` after an implementer attempt, and `needs-human` after an implementer-high attempt or when a human decision is missing. Push the branch first so the work is kept.

## Worktrees and parallel agents

Several agents work at once, each in its own git worktree (Orca creates one per run under `../caracoles-app-worktrees/`).
- Work only inside your worktree. Never edit the primary checkout or another worktree.
- `main` is checked out by the primary checkout, so never `git switch main`. Start with `git fetch origin && git switch -c <type>/<n>-<slug> origin/main`. Before pushing, run `git fetch origin && git rebase origin/main`.
- A fresh worktree has no `node_modules`: run `npm ci` once `package-lock.json` exists.
- Never hard-wire ports. Before anything that starts a server (`npm run dev`, `npm run test:e2e`, a manual check), export free ones: `export PORT=$((3100 + RANDOM % 800)) WEB_PORT=$((5200 + RANDOM % 700))`.
- Push only your own branch. Never push to `main`, and never force-push a branch you did not create.

## Found something outside your issue

- If a bug, gap or missing detail belongs to another open issue, comment on that issue with `file:line`, what is wrong and what is needed. Whoever takes it will resolve it.
- If no issue covers it, open one with the roadmap template (`Goal`, `Read first`, `Files`, `Acceptance criteria`, `Out of scope`) and the `roadmap` label. Put it in the milestone it blocks. If it blocks other issues, mark them as blocked by it: `gh api -X POST repos/TadeoOL/tadeo-5396/issues/<blocked>/dependencies/blocked_by -F issue_id=<id of the new issue from gh api .../issues/<new> --jq .id>`.
- Fix it inside your own PR only if it blocks your acceptance criteria. Otherwise, leave it to its issue.

## Workflow

- Trunk-based: `main` always passes CI. One short-lived branch per issue, named `<type>/<issue>-<slug>` (for example `feat/12-topup-form`), created from `origin/main` inside your worktree.
- Conventional Commits. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`. The optional scope is `web`, `api` or `contracts`; omit it for changes that span packages or live at the root. The subject is English, imperative, lowercase, at most 72 characters, with no trailing period. No issue numbers in commits. **Never add `Co-Authored-By` or any AI attribution trailer.**
- Every commit builds, passes `npm run check` and carries its own tests. Rebase-merge puts every commit on `main`.
- One PR per issue, using the PR template (`.github/pull_request_template.md`) and `Closes #<n>`.
- Wait for the `ci` check (`gh pr checks --watch`), then `gh pr merge --rebase --delete-branch`.

## Definition of done

- [ ] Every acceptance criterion in the issue is met.
- [ ] `npm run check` passes, plus `npm run test:e2e` after `npm run build` when the issue touches end-to-end tests.
- [ ] Tests are in the same commit as the code they cover.
- [ ] The README sections the issue changes are updated, including **its own line in Status**, which must match the code exactly. Skip the Status line only when the issue changes nothing a User can see.
- [ ] If the implementation had to deviate from a spec, the spec is updated in the same PR and the PR body says so.
- [ ] One entry is appended to `docs/ai-usage.md`, following that file's format, including the `Time` line.
- [ ] The PR is merged after `ci` is green, and the issue is closed by `Closes #<n>`.

## When something is missing

If the issue, its comments and the sections it links do not answer a question, comment on the issue with the exact question, then stop as described under "Claim and keep the issue updated" (use `needs-human`). Never invent behavior, names or copy.

Manual acceptance criteria are checked by the agent itself, with `curl` against a server on the exported port or with a short Playwright script. If one can't be checked that way, say so in the PR body.

## Role procedures

- `.claude/agents/implementer.md`: implements one unblocked roadmap issue.
- `.claude/agents/implementer-high.md`: takes over an issue whose implementer attempt failed.
- `.claude/agents/reviewer.md`: reviews a finished milestone (`review` issues).

They are plain Markdown, and any tool can follow them.
