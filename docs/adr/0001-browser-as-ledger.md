# The browser is the ledger; the server keeps no Balance

The brief requires the user, the session and the Balance to persist in localStorage, and the free hosting target wipes server memory whenever it sleeps or redeploys. So the browser is the source of truth for every User, Session, Balance and Top-up, and the Express server keeps only an in-memory store of Charges for idempotent replays and Reconciliation. Each User's Balance is stored next to that User's Top-up history, under one localStorage key, and both are written in a single `setItem`. The Top-up record itself is what stops an approved Charge from being credited twice.

## Considered Options

- **Server as source of truth, localStorage as a cache**: rejected. It contradicts the brief, and the server's memory does not survive a restart on the hosting tier.
- **Store only a `balance` number**: rejected. There is no history to rebuild or audit the Balance from, and nothing to stop a replayed approval from being credited twice.

## Consequences

- Anyone with devtools can edit their own Balance. This is accepted for a local simulation, and the database proposal replaces it with a server-side ledger.
- The server cannot verify `payer_id` or `payer_email`. It validates their format and echoes them back.
- A server restart forgets every Charge. The client keeps its own Top-up records, so the Balance is unaffected; only Reconciliation of Top-ups whose Charge was forgotten needs a rule, which the top-up reliability spec defines.
