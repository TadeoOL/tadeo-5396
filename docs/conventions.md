# Engineering conventions

Every implementation issue follows these rules. They were decided in the ticket [Set engineering conventions: Git workflow, commits, linting, formatting and CI](https://github.com/TadeoOL/tadeo-5396/issues/6).

## Git workflow

- **Trunk-based.** `main` must always pass CI.
- **One short-lived branch per implementation issue**, named `<type>/<issue>-<slug>`, for example `feat/12-topup-form`.
- **Everything reaches `main` through a pull request.** The one exception is planning artifacts written while the planning map is open. Those are committed directly to `main`.
- **Rebase-merge only.** History stays linear, and every commit on the branch lands on `main` unchanged.

## Commits

- [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/).
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`.
  - The scope is optional. When present, it names a package: `web`, `api` or `contracts` (see [`architecture.md`](architecture.md)). Omit it for changes that span packages or live at the root.
- **Subject line**: English, imperative mood, lowercase, at most 72 characters, no trailing period. The body explains why.
- **Each commit is a work unit.** It builds, it passes `npm run check`, and it contains the tests for the code it adds. Rebase-merge puts every commit on `main`, so this is a rule you follow, not something tooling enforces: CI only checks the tip of the PR.
- **No issue numbers in commits.** GitHub links each commit to its PR, and the PR closes the issue.
- **No AI attribution trailers.** AI usage is recorded in [`docs/ai-usage.md`](ai-usage.md).
- The format is documented, not enforced by a tool: there is no commitlint.

## Pull requests

- **One PR per issue.** The body contains `Closes #N`.
- **Size**: aim for about 400 changed lines, not counting the lockfile. Split anything larger into chained PRs.
- **Template** (`.github/pull_request_template.md`) with three sections:
  - *What & why*
  - *Closes*
  - *How verified*: the commands you ran and the scenarios you tried.
- **Self-merge once CI passes.** No approvals are required, because there is one developer.

## Code style

- **ESLint**, flat config, with:
  - `@eslint/js` recommended.
  - `typescript-eslint` `recommendedTypeChecked`. It catches `no-floating-promises` and `no-misused-promises` in async payment code.
  - For the frontend: `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`, the same plugins as the Vite `react-ts` template.
  - Also for the frontend: `eslint-plugin-jsx-a11y` `recommended`, added by [the frontend stack](specs/frontend-stack.md#accessibility).
  - Also for the frontend: a `no-restricted-syntax` rule that bans `dangerouslySetInnerHTML`, added by [the security baseline](specs/security.md#xss).
- **Prettier** with its defaults and no config file. There is no `eslint-config-prettier`: neither ESLint 9 nor `typescript-eslint` enables formatting rules, so there is nothing to switch off.
- **TypeScript**: every package extends one shared base `tsconfig`, which turns on:
  - `strict`
  - `noUncheckedIndexedAccess`
  - `noFallthroughCasesInSwitch`
  - `noUnusedLocals`, `noUnusedParameters`
  - `verbatimModuleSyntax`
  - `erasableSyntaxOnly`: no `enum`s, so use unions of string literals instead. This also keeps Node's built-in type stripping available.

  `exactOptionalPropertyTypes` stays off. It conflicts with the typings of form and UI libraries, and it costs more than it catches.

## Toolchain

- **Node 24 LTS.** `.nvmrc` contains `24`, and the root `package.json` declares `"engines": { "node": "24.x" }`. The range has an upper bound because Render resolves an open-ended range to the newest Node release.
- **npm**, which ships with Node, so a reviewer needs nothing else installed. `package-lock.json` is committed, and CI installs with `npm ci`.
- **Root scripts**:

  | Script | What it does |
  |---|---|
  | `typecheck` | Type-checks every package. |
  | `lint` | Runs ESLint. |
  | `format` | Formats files with Prettier. |
  | `format:check` | Runs `prettier --check`. |
  | `test` | Runs the Vitest suites ([Testing](testing.md)). |
  | `test:watch` | Runs Vitest in watch mode. |
  | `test:e2e` | Runs the Playwright specs against the build. Not part of `check`. |
  | `build` | Builds every package. |
  | `check` | Runs `typecheck`, `lint`, `format:check` and `test`. |

- **No Git hooks.** Run `npm run check` before you push; CI is the gate. Hooks would add two dependencies (Husky and lint-staged) for checks CI already runs. A formatting hook would also rewrite files during the commit, after they were reviewed.

## Continuous integration

A single workflow, `.github/workflows/ci.yml`:

- **Triggers**: `pull_request`, and `push` to `main`.
- `concurrency` cancels older runs for the same ref.
- `permissions: contents: read`.
- **One job, `ci`**, with these steps:
  1. Checkout.
  2. `actions/setup-node`, reading `node-version-file: .nvmrc`, with the npm cache on.
  3. `npm ci`, then `npm audit --omit=dev --audit-level=high` ([security baseline](specs/security.md#transport-and-dependencies)).
  4. `typecheck`, `lint`, `format:check`, `test`.
  5. `build`.
  6. `npx playwright install --with-deps --only-shell chromium`, then `test:e2e`; on failure, upload `playwright-report/` ([Testing](testing.md#continuous-integration)).
- **No version matrix.**
- **CI does not deploy.** Render deploys `main` after its checks pass ([Deployment](deployment.md#auto-deploy-and-the-review-window)). A separate `keep-alive.yml` workflow pings the service during the review window; it gates nothing.

## Repository settings

The first implementation issue applies these settings. They are not applied while planning is still going on, because planning artifacts are still committed directly to `main`.

- **A ruleset on `main`** that:
  - requires a pull request, with zero approvals,
  - requires the `ci` status check to pass,
  - blocks force pushes,
  - requires linear history.
- **Merge methods**: only rebase-merge is enabled.
- **Head branches** are deleted automatically after merge.

## Deliberately left out

| Left out | Reason |
|---|---|
| Biome instead of ESLint and Prettier | Its type-aware rules are younger, and the reference implementation of `react-hooks` is an ESLint plugin. |
| pnpm | Reviewers would have to install it. Corepack stops shipping with Node starting in version 25. |
| Squash-merge | It would hide the work-unit commits that make the history readable. |
| commitlint, Husky, lint-staged | See "No Git hooks" under Toolchain. |
| Dependency update bots | Not worth running on a repository that lives for a week. |
