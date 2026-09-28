# Snailrace

A web app where a User follows a simulated day of snail races, sees how their simulated bets went, and adds funds to their Balance through SnailPay, a mock payment gateway.
The browser keeps Users, the Session and the Balance in localStorage; one Express server hosts SnailPay and the race-day data.

## Requirements

Node 24 (see `.nvmrc`) and npm.

## Run locally

```sh
npm ci
npm run dev
```

`npm run dev` starts the web app on http://localhost:5173 and the API on http://localhost:3000. Vite proxies `/api` to the API. Set `WEB_PORT` and `PORT` to change the two ports.

Open the app on `localhost`. Sign-up and sign-in use Web Crypto, which browsers only allow on `localhost` or HTTPS, so a LAN IP address does not work.

## Run like production

```sh
npm run build
NODE_ENV=production npm start
```

The app and the API are served on http://localhost:3000. `npm start` alone serves only the API: the built app is mounted only when `NODE_ENV` is `production`, as on the host.

## Tests

`npm test` runs every Vitest suite.

Before the first end-to-end run, install the browser once:

```sh
npx playwright install chromium
```

Then run:

```sh
npm run build && npm run test:e2e
```

## Reproduce SnailPay responses

SnailPay decides each result from the Card. The Scenario cards use expiry `12/26` and CVV `543`; any name and any amount from $0.01 to $10,000.00 work. Every Card here is fictitious.

To call the API, start the app (`npm run dev`, or `npm run build && NODE_ENV=production npm start`) and paste this helper into bash or zsh. It sends a $150.00 Charge with a new idempotency key, prints the key (the Charge `reference`), then the status line, the headers and the body. Extra arguments go to `curl`. `lookup <reference>` looks a Charge up, and `outage true` or `outage false` switches the Outage.

```sh
PORT=${PORT:-3000}
charge() {
  card=$1 expiry=$2 cvv=$3
  shift 3
  key=$(node -p 'crypto.randomUUID()')
  echo "reference: $key"
  curl -si "$@" -X POST "http://localhost:$PORT/api/snailpay/charges" \
    -H 'Content-Type: application/json' -H "X-Idempotency-Key: $key" \
    -d "{\"card_number\":\"$card\",\"expiration_date\":\"$expiry\",\"security_code\":\"$cvv\",\"cardholder_name\":\"Ana Lopez\",\"transaction_amount\":15000,\"payer_id\":\"9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d\",\"payer_email\":\"ana@example.com\"}"
  echo
}
lookup() {
  curl -si "http://localhost:$PORT/api/snailpay/charges?reference=$1"
  echo
}
outage() {
  curl -si -X PUT "http://localhost:$PORT/api/snailpay/outage" \
    -H 'Content-Type: application/json' -d "{\"active\":$1}"
  echo
}
```

| To reproduce | API call | Expected response | Expected Top-up outcome | In the UI |
|---|---|---|---|---|
| Approved | `charge 1234123412341234 12/26 543` | `201 approved / accredited` | Credited | Sign in, press **Top up**, enter the row's card number, expiry and CVV and any amount, then press **Top up**. |
| Unknown card number | `charge 1111222233334444 12/26 543` | `402 rejected / cc_rejected_bad_filled_card_number`, with the number masked | Declined | Sign in, press **Top up**, enter the row's card number, expiry and CVV and any amount, then press **Top up**. |
| Wrong expiry | `charge 1234123412341234 11/26 543` | `402 rejected / cc_rejected_bad_filled_date` | Declined | Sign in, press **Top up**, enter the row's card number, expiry and CVV and any amount, then press **Top up**. |
| Wrong CVV | `charge 1234123412341234 12/26 123` | `402 rejected / cc_rejected_bad_filled_security_code` | Declined | Sign in, press **Top up**, enter the row's card number, expiry and CVV and any amount, then press **Top up**. |
| Insufficient funds | `charge 1234123412340002 12/26 543` | `402 rejected / cc_rejected_insufficient_amount` | Declined | Sign in, press **Top up**, enter the row's card number, expiry and CVV and any amount, then press **Top up**. |
| High risk | `charge 1234123412340003 12/26 543` | `402 rejected / cc_rejected_high_risk` | Declined | Sign in, press **Top up**, enter the row's card number, expiry and CVV and any amount, then press **Top up**. |
| Timeout | `charge 1234123412340004 12/26 543 -m 10`, then `lookup <reference>` | No answer within 10 s (`curl` gives up, as the app does), then the lookup answers `200` with `approved / accredited` | Unknown, then Credited | Top up with `1234 1234 1234 0004`, `12/26` and `543`. After 10 s the dialog shows **Confirming your payment**; about 2 s later Reconciliation finds the Charge and shows the receipt. |
| System error | `outage true`, then `charge 1234123412341234 12/26 543`, then `outage false` | `503 error / service_unavailable`, with `Retry-After: 30` | Failed | Turn on **SnailPay outage** under **Simulation controls** on the dashboard, top up with the approval card, then turn the outage off. |
| Invalid data (API only) | `charge 123412341234123 12/26 543` | `400 rejected / invalid_request`, with `errors` | — | The form rejects the same input, so it never reaches SnailPay. |

Sending the same key and body again returns the stored response with `Idempotent-Replayed: true`. The same key with another body returns `422 rejected / idempotency_key_reused`. After 10 Charges in a minute from one IP, SnailPay answers `429 error / rate_limited`.

## Status

- **Sign-up and the protected dashboard**: done. A User registers with full name, email, password and confirmation, is signed in for 24 h, and lands on `/dashboard`, which shows their name and a $0.00 Balance and needs an active Session.
- **Sign-in and sign-out**: done. A User signs out from the header and signs back in with the same email and password. Five failed attempts lock that email for 30 s, doubling up to 15 min.
- **SnailPay API**: done. `POST /api/snailpay/charges` answers every card Scenario in one response shape, replays a repeated `X-Idempotency-Key`, masks card numbers outside the Scenario catalog and allows 10 Charges per minute per IP. `GET /api/snailpay/charges?reference=` looks a Charge up (60 per minute per IP), and `PUT /api/snailpay/outage` switches the Outage, during which both Charge routes answer `503`.
- **Top-ups**: done. The dashboard's **Recargar** dialog validates the amount and the Card and pays through SnailPay. An approved Charge credits the Balance once and shows a receipt and a toast; the Balance is kept per User in localStorage and survives a reload.
- **Server warm-up**: done. Every screen checks `/api/health`, and the Top-up dialog keeps its submit button disabled until the server answers, with "Intentar de nuevo" when it can't be reached.
- **Top-up outcomes and history**: done. Declined and Failed Top-ups show their reason in the dialog and in a toast, and a `bad_filled` decline marks its field. The dashboard lists every Top-up, newest first, and its Simulation controls switch the SnailPay Outage.
- **Reconciliation**: done. A Top-up with no answer from SnailPay shows as Confirming and stays out of the Balance. The app looks its Charge up by reference at 2, 4, 8, 16 and 32 s, again on every load or sign-in, and when the User presses **Verificar de nuevo**, and settles it once SnailPay answers.
- **Race-day data**: done. `GET /api/race-days/:date` returns the day's six Races and `GET /api/race-days/:date/bets?userId=` returns a User's 4 to 12 Bets, both generated from a seed and stored nowhere.
- **Recovery screens**: done. If the Users registry or a ledger in localStorage fails its checks, the app shows "No se pueden leer tus datos guardados" with "Restablecer datos locales", which removes every `snailrace.v1.*` key. Any other render error shows "Algo salió mal" with "Recargar la página".
- **Race-day charts**: done. The dashboard charts today's Wins per Snail as bars in each Snail's silks and the User's won and lost Bets as a donut. Each chart has a text summary, a loading skeleton and a "Intentar de nuevo" on error.
- **Spanish UI**: done. Every screen, message and format is in neutral Spanish.
