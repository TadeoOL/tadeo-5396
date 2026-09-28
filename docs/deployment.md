# Deployment

How the app is deployed so reviewers can use it from a public URL, without credentials. Terms follow [`CONTEXT.md`](../CONTEXT.md). The platform comparison is in the [hosting research](https://github.com/TadeoOL/tadeo-5396/blob/research/free-hosting-spa-express/docs/research/free-hosting-spa-express.md).

## Summary

- **One free Render Web Service.** Express serves the API and the Vite build from one origin.
- **Configuration as code**: a `render.yaml` Blueprint at the repository root.
- **Auto-deploy after CI passes** on `main`. Docs-only commits do not deploy.
- **No app-specific environment variables.** Render provides `PORT` and `NODE_ENV`.
- **Cold starts** are handled in two ways. A keep-alive ping runs during the review window. The UI checks `/api/health` before it enables the Top-up form.
- **The `trust proxy` hop count is measured** on the first deploy, not assumed.

## Platform

Render, one free Web Service, Node runtime.

- **No card is needed**, the free tier does not expire, and there is exactly one instance. The in-memory Charge store, the Outage and the rate limiter therefore behave as they do locally.
- **One service, not two.** A static frontend with a separate API would make the reviewer's first API call the Charge itself. That call would hit the cold start and look like a SnailPay timeout. One origin also means no CORS and no build-time API URL.
- **Fallback, rejected: Vercel Hobby.** Express would run as a Function whose instances are recycled and can run in parallel. Idempotent replay, Reconciliation lookups and the Outage all depend on one process's memory, so they would behave inconsistently.

## The Blueprint

`render.yaml` at the repository root:

```yaml
services:
  - type: web
    name: snail-race
    runtime: node
    plan: free
    region: oregon
    buildCommand: npm ci --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    autoDeployTrigger: checksPass
    buildFilter:
      ignoredPaths:
        - docs/**
        - '**/*.md'
        - .github/**
```

- **The root directory is the repository root.** `api` imports the `contracts` workspace, and Render hides files outside the root directory at build time and at runtime.
- **Node version**: Render reads `.nvmrc` (`24`). `engines` keeps its upper bound ([Conventions](conventions.md#toolchain)). No `NODE_VERSION` variable is set.
- **Region** cannot be changed after creation. Oregon is Render's default. No reviewer location justifies another choice.
- **If creating a Blueprint asks for a payment method** (older community reports mention this), create the service by hand in the dashboard with the same values. `render.yaml` stays as the record of the configuration.

## Build and start

- **Build**: `npm ci --include=dev && npm run build`.
  - `npm ci` uses the committed lockfile.
  - `--include=dev` keeps `vite` and `typescript` installed even if `NODE_ENV=production` reaches the build step. Render sets `NODE_ENV` at runtime only, but its docs do not say whether the build sees service variables. The flag costs nothing.
  - `npm run build` builds only `web`. `api` and `contracts` run as TypeScript source ([ADR 0002](adr/0002-run-typescript-with-node-type-stripping.md)).
- **Start**: `npm start`, which runs `node src/server.ts` in `api`.
- **Listen on `0.0.0.0`**: `server.ts` calls `app.listen(config.port, '0.0.0.0')`. Render requires it, and Node's default (`::`) is not documented as working.

## Environment

| Variable | Source | Value |
|---|---|---|
| `PORT` | Render | `10000`. Defaults to `3000` locally ([Architecture](architecture.md#configuration)). |
| `NODE_ENV` | Render, at runtime | `production`. Not set in the Blueprint. |

Nothing else is configured, on purpose:

- **CORS**: none. One origin ([Security](specs/security.md#express)).
- **API base URL**: none. The web app always calls a relative `/api`.
- **SnailPay simulation**: Scenarios are chosen by card number, and the Outage is toggled at runtime with `PUT /api/snailpay/outage` ([SnailPay API](specs/snailpay-api.md#outage)). Neither needs a redeploy or a variable.
- **Timeouts**: the 10 s client timeout and the 30 s timeout Scenario are code constants ([Top-up reliability](specs/top-up-reliability.md)).

## Serving the web app

- `app.ts` resolves the build folder from its own location: `path.join(import.meta.dirname, '../../web/dist')`. No variable is needed, because the path is the same on every machine.
- **Only when `NODE_ENV` is `production`**, `createApp` mounts, after the API routes:
  1. a `404` in the error envelope for any unmatched `/api` path, so a typo in an API route never returns HTML;
  2. `express.static` on the build folder;
  3. the SPA fallback, `app.get('/{*splat}')`, which sends `index.html` (Express 5 rejects a bare `'*'`).
- In dev, Vite serves the frontend and proxies `/api`.
- The end-to-end suite runs against the production build ([Testing](testing.md)). Its Playwright `webServer` starts the API with `env: { NODE_ENV: 'production' }`.

## Proxy hop count

Requests reach Express through Cloudflare and then Render's load balancer. Render does not document how many hops that is, and it appends to an existing `X-Forwarded-For` instead of replacing it, so the leftmost entry can be forged. `trust proxy: 1` is therefore an assumption, and if it is wrong, the per-IP rate limiter keys on the wrong address.

The number is measured on the first deploy:

1. Deploy with a temporary `GET /api/debug/ip` that returns `req.ip` and the raw `X-Forwarded-For`.
2. Call it from a known IP. Raise the `trust proxy` value until `req.ip` shows that IP (the method in express-rate-limit's troubleshooting guide).
3. Set the measured number as a constant in `app.ts`, with a comment that says it was measured on Render. Remove the endpoint in the same PR.

It is a constant, not a variable, because it depends on the host, not on the environment.

## Auto-deploy and the review window

- **`autoDeployTrigger: checksPass`**: Render deploys a commit on `main` only after its GitHub checks pass. Under the `main` ruleset, every merge has already passed `ci` on its PR, and the push run of `ci` confirms it again.
- **`buildFilter`** skips deploys for commits that touch only docs and workflows.
- **Freeze during the review window.** Every deploy empties the Charge store, turns the Outage off and resets the rate limiter. No merges to `main` during the review window, except a fix for something broken.

## Cold starts

A free service spins down after 15 minutes without inbound traffic, and spinning up takes about a minute. On a first visit, Render shows its own loading page to the browser. What a `fetch` gets during spin-up is not documented: it may wait, or it may fail.

### Keep-alive

`.github/workflows/keep-alive.yml` pings the service during the review window:

- Triggers: `schedule` every 10 minutes (`*/10 * * * *`) and `workflow_dispatch`.
- `permissions: {}`. One step: `curl -fsS --max-time 90 "$KEEP_ALIVE_URL/api/health"`.
- **Off unless configured.** The job runs only `if: vars.KEEP_ALIVE_URL != ''`. Setting the repository variable to the service URL starts the pings. Deleting it stops them.
- One always-on free service uses about 720 of the 750 free instance hours per month. No other free service may share the workspace.
- **Best effort.** GitHub delays scheduled runs under load, sometimes by more than 15 minutes, and it disables schedules after 60 days without repository activity. If the pings are not reliable enough, an external uptime monitor pinging the same URL is the backup. It needs no repository change.

The keep-alive is a convenience, not a correctness measure. Because the page and the API are one service, a cold start delays the page load, not the Charge.

### Warm-up in the UI

This is the case the keep-alive does not cover: a tab left open while the service slept.

- A `useQuery` with the key `['health']` calls `GET /api/health`.
- It is mounted in the app shell, so it starts on every screen, including sign-in, and the server wakes while the User signs in.
- `staleTime`: 5 minutes. It refetches on window focus (the TanStack default) and when the Top-up form mounts.
- **Its own timeout is 90 s**, not the Charge's 10 s, with `retry: 2`. That covers both possible spin-up behaviors: a request that waits and a request that fails.
- **The Top-up submit button is enabled only when the query has succeeded and is not fetching.** While it waits, the form shows "Waking up the server. This can take up to a minute." If it fails, the form shows a retry action.
- This message is deliberately different from the SnailPay timeout. A waking server is not a Scenario, and the reviewer must be able to tell them apart.
- **Residual case**: the server spins down while the tab keeps focus, and the User submits without a new check. The `POST` then hits the cold start, the client times out after 10 s, and the Top-up is Unknown. Reconciliation settles it, and the 2-minute rule for `404` was sized for exactly this ([Top-up reliability](specs/top-up-reliability.md)).

## In-memory state

The Charge store, the Outage flag and the rate-limiter counters live in process memory. They are lost on spin-down, on every deploy, and on any restart Render decides to do.

| Lost | Effect | Why it is safe |
|---|---|---|
| Charges | A lookup by `reference` returns `404`; an idempotent replay processes the Charge again | The browser ledger credits a Top-up at most once ([ADR 0001](adr/0001-browser-as-ledger.md)); an Unknown Top-up with a `404` settles as Failed after 2 minutes |
| The Outage | It turns off | It is a demo switch; the UI reads its current state with `GET /api/snailpay/outage` |
| Rate-limiter counters | They reset | They only bound abuse |

## First deploy checklist

1. Connect the GitHub repository in Render and create the Blueprint from `render.yaml` (or the service by hand, see above).
2. Wait for the health check to pass, then open the URL and walk through sign-up, a Top-up with each Scenario, and the Outage.
3. Measure the proxy hop count and remove the debug endpoint ([Proxy hop count](#proxy-hop-count)).
4. Record the URL in the README.
5. At the start of the review window, set `KEEP_ALIVE_URL` and stop merging to `main`.

## For the response document

The deployment section of the response document covers:

- **URL** of the service.
- **Platform**: one free Render Web Service; why one service instead of a split; why not Vercel.
- **How**: a `render.yaml` Blueprint; npm workspaces built with `npm ci` and `vite build`; Express serves the build and the API from one origin; auto-deploy after CI passes.
- **Limitations**:
  - A cold start of about a minute after 15 idle minutes, softened by the keep-alive and the UI warm-up.
  - In-memory state is lost on spin-down, deploy and restart (the table above).
  - The Outage is global: a reviewer who turns it on turns it on for everyone.
  - The free tier's 750 hours per month, and a keep-alive that is best effort.

## Left out

| Left out | Reason |
|---|---|
| A split frontend and API | The first API call would be the Charge, on a cold start; it would also need CORS and a build-time URL |
| Vercel, Netlify, Cloudflare Workers | Instances do not share memory, so the Charge store and the Outage would be inconsistent |
| Environment variables for the Outage, Scenarios or timeouts | A reviewer cannot change a variable, and a change would need a restart |
| A `TRUST_PROXY_HOPS` variable | The value depends on the host, which does not change |
| A `WEB_DIST_DIR` variable | The path is the same everywhere |
| Deploying from CI | Render's `checksPass` trigger already waits for CI |
| A paid instance with no spin-down | It needs a card, and the keep-alive covers a review week |
