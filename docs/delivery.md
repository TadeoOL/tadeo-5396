# Delivery package

What gets handed in, where each part lives, and the checks that run before submission. Terms follow [`CONTEXT.md`](../CONTEXT.md).

## Contents

| Deliverable | Where it lives |
|---|---|
| Instructions to run the frontend and backend | `README.md` |
| Instructions to run the tests | `README.md` |
| How to reproduce every SnailPay response | `README.md`, the Scenario table |
| Public repository link | The response document |
| Response document | A PDF submitted separately; its source stays out of the repository |

## README

One `README.md` at the root, written for a reviewer. Sections, in this order:

1. **What it is**: two lines.
2. **Live app**: the public URL, and a note that the first request after 15 idle minutes takes about a minute ([cold starts](deployment.md#cold-starts)).
3. **Requirements**: Node 24 (`.nvmrc`) and npm.
4. **Run locally**: `npm ci`, then `npm run dev`; the web app on port 5173 and the API on port 3000 ([scripts](architecture.md#scripts)).
5. **Run like production**: `npm run build`, then `NODE_ENV=production npm start` (without `NODE_ENV=production`, `npm start` serves only the API).
6. **Tests**: `npm test`; `npm run test:e2e` after `npm run build` and a one-time `npx playwright install chromium` ([commands](testing.md#layout-and-commands)).
7. **Reproduce SnailPay responses**: the Scenario table, below.
8. **Status**: what is finished and what is pending. It must match the code exactly, since any gap between the code and what is declared finished is penalized.
9. **Docs**: links to `CONTEXT.md`, `docs/adr/`, `docs/specs/`, `docs/design/`, and the other `docs/*.md` files.

The README grows with the build. The bootstrap issue creates it with sections 1, 3, 4 and 6. Each feature issue updates the sections it changes and, in the same PR, adds or updates its own line in the Status section, so Status matches the code at every merge. The final README issue verifies Status against the code and checks every command against a fresh clone.

## Scenario table

The README holds the **canonical** Scenario table. Each row gives the API call that reproduces it and, where the UI can trigger it, the steps a reviewer takes in the UI, including how to turn the Outage on and off (that control comes from the screen design).

- **Starting point**: the [seed table](specs/snailpay-api.md#reproduction-table-seed) in the SnailPay spec.
- **The table lands with the issue "SnailPay: create Charges for every Scenario"**, with the API call for every row. That issue also replaces the seed section in the spec with a link to the README table, and the link in the [requirement map](testing.md#requirement-map) moves with it. The table then lives in exactly one place.
- **Later issues add the UI steps** to the rows their screens can trigger.
- The tier 1 test that runs every row keeps the table and the code in sync.

## Response document

The brief's rules apply: Arial 10 pt, standard line spacing, at most 4 pages plus one per finished optional task, and no source code, code snippets or screenshots.

- **Language: Spanish.** The reviewers wrote the brief in Spanish, and the document's clarity is graded. This is the one exception to the "all artifacts in English" rule; the repository stays in English.
- **Format**: written as a `.docx` and exported to PDF, since Word controls the font and the page count exactly.
- **Source outside the public repository**: a gitignored folder. Its structure mirrors the brief, and nothing in the repository may help identify the exercise.

### Outline

| Page | Section | Summarizes |
|---|---|---|
| 1 | Process summary | The planning map, then the build issue by issue; [`ai-usage.md`](ai-usage.md) |
| 1 | Main decisions | [Domain model](../CONTEXT.md), [browser as ledger](adr/0001-browser-as-ledger.md), [SnailPay contract](specs/snailpay-api.md), [Top-up reliability](specs/top-up-reliability.md), [auth simulation](specs/auth.md) |
| 2 | Tools, libraries and templates | [Frontend stack](specs/frontend-stack.md), [architecture](architecture.md), [conventions](conventions.md), [visual direction](design/visual-direction.md). Includes the brief's design declaration: which template or tool was used, what was generated or taken as a base, and what was adapted or built by hand |
| 2 | AI usage and validation | [`ai-usage.md`](ai-usage.md) |
| 3 | Tests and why | [Testing strategy](testing.md): the risk tiers and the requirement map |
| 4 | Finished features | The README Status section |
| 4 | Incomplete features and known issues | The README Status section and the documented limits in [security](specs/security.md#documented-only) and [deployment](deployment.md#for-the-response-document) |
| 4 | Approximate time spent | The maintainer's estimate |
| 4 | Repository link | — |
| 5 | Optional: deployment | [For the response document](deployment.md#for-the-response-document) |
| 6 | Optional: database proposal | [`db-proposal.md`](db-proposal.md) |

The Scenario table is not copied into the PDF; the document points to the README.

### Time spent

The maintainer estimates the time spent when writing the response document.

## Hygiene pass

Runs before submission, after the last feature issue:

1. **No references to the organization or the exercise**: search the working tree, the full history of every branch, commit messages, issues and their comments, and the repository description. The search pattern is never committed.
2. **The brief stays out**: confirm the local requirements file was never tracked (`git log --all -- <file>` is empty).
3. **Local tool caches**: every untracked tool folder at the root is gitignored or removed, so a fresh clone holds only the project.
4. **Research branches are kept**: closed tickets link to them, and they are evidence of the AI-assisted process. They are covered by step 1.
5. **Repository name** follows the required `[first-name]-[4 digits]` format.

## Roadmap closing issues

The implementation roadmap ends with two issues:

1. **Finalize the README and run the hygiene pass** (AFK): verifies the Status section and the Scenario table against the code, checks every README command on a fresh clone, and runs the hygiene pass.
2. **Write the response document** (HITL), blocked by the first: the maintainer states the time spent and confirms how the AI output was validated.
