# Simulated race-day and bet data

The dashboard's two charts show simulated data: the Wins of each Snail during one Race Day (bar chart) and the User's won and lost Bets on that Race Day (donut chart). This spec defines how that data is generated, served and cached. Terms follow [`CONTEXT.md`](../../CONTEXT.md).

## Rules the data must respect

- There are six Snails, and all six run every Race.
- A Race Day has exactly six Races, each with exactly one winning Snail (no ties), so the Wins of a Race Day always add up to 6.
- A Bet is on one Snail in one Race of the same Race Day. It is **won** if and only if that Snail won that Race, and **lost** otherwise.
- A User can have several Bets in the same Race. Bets carry no amount and never affect the Balance.

## Snails

| id | name |
|---|---|
| `comet` | Comet |
| `mossback` | Mossback |
| `pepper` | Pepper |
| `drizzle` | Drizzle |
| `nacho` | Nacho |
| `sprinkles` | Sprinkles |

The ids are stable slugs. The order of this table is the order the API returns and the bar chart shows.

## Generation

All simulated data is generated on the Express server by one pure, deterministic function. Neither the server nor the browser persists it (see [State and persistence](state-and-persistence.md)).

- **The date comes from the client.** The client sends its local calendar date (`YYYY-MM-DD`), so the server's time zone never decides which day "today" is.
- **Races are seeded by the date alone.** Every User sees the same Race Day for the same date, and a reload shows the same results.
- **Bets are seeded by `userId + date`.** Each User gets their own Bets, stable across reloads.
- **PRNG**: mulberry32, seeded with a 32-bit string hash of the seed text. It is small, dependency-free and deterministic.
- **A Race Day is always complete.** All six Races have already finished; the day does not progress with the clock.
- **Race winners**: each Race's winner is drawn uniformly from the six Snails.
- **Bets**: each User gets between 4 and 12 Bets per Race Day (inclusive). Each Bet picks a Race and a Snail uniformly. Its outcome is **derived from the Race's winner, never drawn separately**, so an incongruent Bet cannot exist. With uniform picks, about one Bet in six is won. This ratio is kept as it is, not tuned to make the chart look better.

## API

Both endpoints are `GET`, return JSON, and never modify state.

### `GET /api/race-days/:date`

The Race Day, which is the same for every User.

```json
{
  "date": "2026-09-28",
  "snails": [{ "id": "comet", "name": "Comet" }],
  "races": [{ "number": 1, "winnerSnailId": "pepper" }]
}
```

- `snails`: the six Snails, in table order.
- `races`: six entries, with `number` from 1 to 6. Each Race carries only its winner; there is no full finishing order, because nothing uses one.

### `GET /api/race-days/:date/bets?userId=<uuid>`

The User's Bets on that Race Day.

```json
{
  "date": "2026-09-28",
  "userId": "3f0c…",
  "bets": [{ "raceNumber": 3, "snailId": "nacho", "outcome": "lost" }]
}
```

- `outcome` is `"won"` or `"lost"`, computed on the server from the Race's winner.
- Bets have no `id`, because nothing displays them one by one.
- The server accepts `userId` as given. It checks the format only, because the auth is a local simulation and the server holds no users.

### Validation

Both endpoints respond `400` when:

- `date` is not `YYYY-MM-DD`, or is not a real calendar date (for example `2026-02-30`).
- `userId` (bets endpoint only) is missing or is not a UUID.

Future dates are **not** rejected. The data is a simulation, so any valid date simply yields its own deterministic Race Day.

## Aggregation

The API returns raw domain data; the client counts. Two pure functions, tested on their own:

- **Wins per Snail**: count `races` by `winnerSnailId`, one entry for each of the six Snails, including Snails with zero Wins. The counts always add up to 6.
- **Won vs. lost**: count `bets` by `outcome`.

## Caching

| Layer | Race Day | Bets |
|---|---|---|
| Server | None: generating the data is deterministic and takes microseconds | None |
| HTTP | `Cache-Control: public, max-age=86400`, plus Express's default weak ETag | `Cache-Control: private, max-age=86400`, plus ETag |
| Client server-state cache | Key `[date]`, `staleTime: Infinity` | Key `[date, userId]`, `staleTime: Infinity` |

- There is no `immutable` directive. A deploy that changes the generator must not leave old responses cached forever.
- The client's server-state library is chosen in the frontend stack ticket; this spec fixes only the policy.

## Edge cases

- **A User with no Bets.** The generator always produces at least 4 Bets, so a new User already sees the donut. The UI still shows an empty-state message instead of the donut when the count is 0; this guards against errors or unexpected data.
- **The day changes at midnight.** The date is computed when the dashboard mounts and on reload. A dashboard left open past midnight keeps showing the previous Race Day until it reloads. This is accepted.
