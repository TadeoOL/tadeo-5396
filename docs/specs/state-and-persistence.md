# State and persistence

Who owns each piece of state, where it lives, and how it stays consistent. The terms used here are defined in [`CONTEXT.md`](../../CONTEXT.md). The rationale for keeping the ledger in the browser is in [ADR 0001](../adr/0001-browser-as-ledger.md).

## Ownership

| State | Source of truth | Where it lives | Lifetime |
|---|---|---|---|
| Users (profile + credential) | Browser | `snailrace.v1.users` | Until local data is cleared |
| Session | Browser | `snailrace.v1.session` | Until sign-out or expiry |
| Sign-in throttle | Browser | `snailrace.v1.throttle` | Until a successful sign-in or local data is cleared |
| Balance | Browser | `snailrace.v1.ledger.<userId>` | Until local data is cleared |
| Top-ups (including the Charge response, with the card data) | Browser | `snailrace.v1.ledger.<userId>` | Until local data is cleared |
| Charges | Server | In-memory store in the Express process | Until the process restarts |
| Race Day and Bets | Nobody. Derived from a seed on each read | Not persisted | — |

Nothing else is persisted. No card data is stored anywhere except inside the Charge response of the Top-up it belongs to, so there are no "saved cards".

## localStorage keys

There are four kinds of key, all prefixed with `snailrace.v1.`. The `v1` is the schema version.

```ts
// snailrace.v1.users
type UsersRecord = Record<UserId, {
  id: UserId;            // UUID v4, generated at sign-up
  fullName: string;
  email: string;
  credential: Credential; // shape defined in the auth spec; never the plain password
}>;

// snailrace.v1.session
type SessionRecord = { id: string; userId: UserId; issuedAt: string; expiresAt: string }; // see the auth spec

// snailrace.v1.throttle
type ThrottleRecord = Record<NormalizedEmail, { failures: number; lockCount: number; lockedUntil?: string }>; // see the auth spec

// snailrace.v1.ledger.<userId>
type LedgerRecord = {
  balanceCents: number;  // integer, >= 0
  topUps: TopUp[];       // newest last
};

type TopUp = {
  id: string;            // UUID v4; also the idempotency key and the Charge `reference`
  amountCents: number;   // integer, > 0
  createdAt: string;     // ISO 8601
  outcome: 'pending' | 'credited' | 'declined' | 'failed' | 'unknown';
  charge?: ChargeResponse; // stored verbatim when a response arrives; shape defined by the SnailPay contract
  settledAt?: string;    // set when the outcome becomes credited, declined or failed
};
```

- **One ledger key per User.** A write for one User never touches another User's data, and the Balance and the Top-up that changes it land in the same `setItem`.
- **One Session per browser**, shared by every tab. To switch Users, you sign out and sign in again.

## Write rules

1. **Read-modify-write on fresh data.** Every write reads the key from localStorage, validates it, applies the change and writes it back, all in the same synchronous task. It never writes from React state. localStorage is synchronous, so a tab cannot interleave with itself. The known ceiling: browsers do not guarantee cross-tab atomicity, which is acceptable for a simulation.
2. **Write-ahead.** A Top-up is appended as `pending` *before* the Charge request is sent. The card data is not stored at this point; it enters localStorage only as part of the Charge response.
3. **Allowed outcome transitions:**
   - `pending` → `credited` | `declined` | `failed` | `unknown`
   - `unknown` → `credited` | `declined` | `failed` (through Reconciliation)
   - `credited`, `declined` and `failed` are final.
4. **Crediting happens once.** Only the transition into `credited` adds `amountCents` to `balanceCents`, in the same write that changes the outcome. A Top-up that is already `credited` is left untouched, so replayed or duplicate approvals are no-ops. This takes the place of a separate "applied Charge ids" set.
5. **Invariant:** `balanceCents` equals the sum of `amountCents` over the `credited` Top-ups. It is checked on every read of the ledger.
6. **Pending on load.** When the app starts, any `pending` Top-up is turned into `unknown`, because nothing is waiting for its response any more. A second tab that opens while the first tab's request is still in flight will also do this. That is safe: when the late response arrives, it applies through the `unknown` transitions, and rule 4 still credits the Top-up at most once.

## Versioning and invalid data

- The schema version lives in the key prefix. No migration code exists until a `v2` does. When one does, it reads the `v1` keys, writes the `v2` keys, and deletes the `v1` keys.
- Every read validates the value against its schema:
  - **Session invalid or missing**: remove the key and treat the User as signed out.
  - **Throttle invalid**: discard it silently. It holds no Balance.
  - **Ledger missing**: read it as `{ balanceCents: 0, topUps: [] }`. Sign-up does not create it; the first Top-up writes it.
  - **Users or ledger invalid, including a broken invariant**: never repair or delete it silently, since that could lose Balance. Show an explicit error with a "Reset local data" action that removes every `snailrace.v1.*` key.

## Multi-tab consistency

- Each tab listens for the `storage` event, filtered by the `snailrace.v1.` prefix. The event fires only in *other* tabs.
  - When `snailrace.v1.session` is removed or changed, the tab re-reads the Session and sends the User to sign-in if there is none.
  - When `snailrace.v1.ledger.<userId>` of the signed-in User changes, the tab re-reads the ledger, which updates the Balance and the history.
- Rule 1 prevents the lost-update case in which a stale tab writes an old Balance back over a Top-up credited in another tab.

## Server state

- The Express process holds one in-memory store of Charges, keyed by idempotency key. The idempotency key is also the `reference`, so the same map serves idempotent replays and lookups by `reference` for Reconciliation. The SnailPay contract defines what is stored per entry and which responses are stored. System errors, for example, are not stored.
- The server never computes, stores or returns a Balance.
- **Restart ceiling:** a restart, redeploy or sleep on the hosting tier empties the store. The Balance is unaffected because the browser owns it. The top-up reliability spec decides how Reconciliation settles an `unknown` Top-up whose Charge the server no longer knows.
- The store is not capped. This is a deliberate ceiling for a mock; a TTL or LRU is the upgrade path if memory ever matters.

## Trust boundary

- The server has no Users, so it cannot verify `payer_id` or `payer_email`. It checks that `payer_id` is a UUID and that `payer_email` is a well-formed email, and echoes both back in the response.
- Anyone with devtools can edit their own Balance, Users or Top-ups. This is accepted for a local simulation. The database proposal moves the ledger and identity to the server.

## Constraints handed to other tickets

- **Auth spec:** defines `Credential`, `SessionRecord` and the sign-in throttle ([auth.md](auth.md)). The Users registry is keyed by `id`, and sign-in finds a User by email with a linear scan.
- **SnailPay contract:** after a reload, a Top-up has no card data, so Reconciliation must be able to look a Charge up by `reference` alone, without resending the request.
- **Top-up reliability:** decides the Reconciliation flow, including the case where the Charge was forgotten after a server restart, and the retry and timeout rules that move a Top-up between outcomes.
- **Race-day data:** decides the seed and how the data is generated. It must stay stable across reloads without being persisted.
- **Security baseline:** decides how card data is masked in the UI. It is stored unmasked, because the brief requires it.
