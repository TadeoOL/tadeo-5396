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

## Status

- **Sign-up and the protected dashboard**: done. A User registers with full name, email, password and confirmation, is signed in for 24 h, and lands on `/dashboard`, which shows their name and a $0.00 Balance and needs an active Session.
- **Sign-in and sign-out**: done. A User signs out from the header and signs back in with the same email and password. Five failed attempts lock that email for 30 s, doubling up to 15 min.
