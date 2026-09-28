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
