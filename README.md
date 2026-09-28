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
npm start
```

`npm start` serves the app and the API on http://localhost:3000.

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

To call the API, start the app (`npm run dev`, or `npm run build && npm start`) and paste this helper into bash or zsh. It sends a $150.00 Charge with a new idempotency key, prints the key (the Charge `reference`), then the status line, the headers and the body. Extra arguments go to `curl`.

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
```

| To reproduce | API call | Expected response | Expected Top-up outcome | In the UI |
|---|---|---|---|---|
| Approved | `charge 1234123412341234 12/26 543` | `201 approved / accredited` | Credited | — |
| Unknown card number | `charge 1111222233334444 12/26 543` | `402 rejected / cc_rejected_bad_filled_card_number`, with the number masked | Declined | — |
| Wrong expiry | `charge 1234123412341234 11/26 543` | `402 rejected / cc_rejected_bad_filled_date` | Declined | — |
| Wrong CVV | `charge 1234123412341234 12/26 123` | `402 rejected / cc_rejected_bad_filled_security_code` | Declined | — |
| Insufficient funds | `charge 1234123412340002 12/26 543` | `402 rejected / cc_rejected_insufficient_amount` | Declined | — |
| High risk | `charge 1234123412340003 12/26 543` | `402 rejected / cc_rejected_high_risk` | Declined | — |
| Timeout | `charge 1234123412340004 12/26 543` | `201 approved / accredited`, after 30 s | Unknown, then Credited | — |
| Invalid data (API only) | `charge 123412341234123 12/26 543` | `400 rejected / invalid_request`, with `errors` | — | — |

Sending the same key and body again returns the stored response with `Idempotent-Replayed: true`. The same key with another body returns `422 rejected / idempotency_key_reused`. After 10 Charges in a minute from one IP, SnailPay answers `429 error / rate_limited`.

## Status

- **Sign-up and the protected dashboard**: done. A User registers with full name, email, password and confirmation, is signed in for 24 h, and lands on `/dashboard`, which shows their name and a $0.00 Balance and needs an active Session.
- **Sign-in and sign-out**: done. A User signs out from the header and signs back in with the same email and password. Five failed attempts lock that email for 30 s, doubling up to 15 min.
- **SnailPay API**: done. `POST /api/snailpay/charges` answers every card Scenario in one response shape, replays a repeated `X-Idempotency-Key`, masks card numbers outside the Scenario catalog and allows 10 Charges per minute per IP.
