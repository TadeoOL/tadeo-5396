# Free hosting for the React SPA + Express API

Research for issue #4. Terms checked on **2026-09-28** against official pricing and docs pages (see Sources). Free tiers change often; re-check the week you deploy.

## Recommendation

1. **Render, one free Web Service where Express serves the Vite build (same origin).** No credit card required, no expiry, and exactly one instance, so the in-memory SnailPay state behaves the same as it does locally. One URL, no CORS, one set of env vars. The cost is the cold start: after 15 min idle the service spins down, and the next request takes about 1 min. Fix that with a keep-alive ping during the review week (one service running 24/7 is about 720-744 h, inside the 750 free h/month), and make the UI treat a slow wake-up differently from a SnailPay timeout.
2. **Vercel Hobby, one project (Vite static output plus Express as a Vercel Function).** This is the fallback if cold starts are unacceptable. No card needed, the CDN serves the SPA, and Fluid compute keeps cold starts small. However, in-memory state is **not** guaranteed: instances are recycled and several can run at once. The idempotency store is best-effort, and a runtime "outage toggle" held in memory would be flaky. Reviewers must get the **production domain**, because Standard Protection puts every other URL behind a Vercel login.
3. **Railway trial.** It behaves most like a normal server (no sleep, one replica, no card), but it runs on credit: $5 or 30 days, whichever ends first, and then a $1/month Free plan that an always-on Node process can use up. Pick it only if the account is created a few days before submission and the review happens within 30 days.
4. Netlify (credit-based; running out pauses every project in the team) and Cloudflare Workers (needs an Express adapter and a different runtime) work but add risk or porting work.
5. **Not viable without a card:** Fly.io, Koyeb, Google Cloud Run (standard tier).

**Single service beats split** here. The app only calls the backend for a top-up, since auth and balance live in localStorage. With a split (static CDN frontend plus an API that sleeps), the page loads instantly, and then **the first backend call is the top-up itself**, which hits the cold start and shows up as a false SnailPay timeout. A split also brings CORS, a build-time `VITE_API_URL`, and a preflight on every top-up, because a custom `Idempotency-Key` header triggers one.

## Comparison

| Platform | Free tier (2026-09) | Card required? | Sleep / cold start | Monorepo / workspaces | Express model | In-memory state | Limits that could bite in a review week |
|---|---|---|---|---|---|---|---|
| **Render** | Free web service (0.1 CPU / 512 MB) + free static sites; 750 instance-h/month; Hobby workspace includes 5 GB egress, 500 build min | No (official, Apr 2026) | Spins down after 15 min without inbound traffic; ~1 min to spin up | Root Directory + build filters; files outside root dir are **not** available, so keep root = repo root when sharing a workspace package | Long-running Node process (`app.listen(PORT)`) | Single instance (no scaling on free) → consistent; **lost** on spin-down, restart ("at any time") or deploy | Over 750 h or 5 GB egress with no card on file → services suspended until month end; 1 min cold start |
| **Vercel Hobby** | 1M invocations, 4 h Active CPU, 360 GB-h memory, 100 GB transfer / month; 300 s max duration | No | Fluid compute: bytecode caching + pre-warming on production; small cold starts | Root Directory + "include files outside root" (default on) | Express app becomes **one Vercel Function**; `express.static()` ignored (static from CDN / `public/`) | Instances shared by concurrent requests but recycled and possibly multiple → **not reliable** | Exceed a limit → feature paused ~30 days; preview URLs need Vercel login; non-commercial use only |
| **Railway** | Trial: $5 one-time, 30 days, 1 GB RAM; then Free: $1/month, 0.5 GB RAM, 1 replica, 1 project | No | No sleep by default (opt-in "Serverless" sleeps after 5-10 min idle; first request may 502) | Root directory per service; workspaces via custom build/start commands | Long-running Node process | Single replica → consistent; lost on redeploy/restart | Credit hits $0 → **all workloads stopped**; RAM billed $10/GB/month |
| **Netlify Free** | 300 credits/month (deploy = 15, 1 GB egress = 20, 1 GB-h compute = 10, 10k requests = 2) | No | Functions (AWS Lambda style) cold starts | Base directory; workspaces supported | Express wrapped with `serverless-http` in a Netlify Function; 60 s sync limit | Per function instance, not shared, not durable | Credits out → **all team projects paused** ("Site not available") until next cycle; ~20 production deploys/month max |
| **Cloudflare Workers Free** | 100k requests/day, 10 ms CPU/request, 128 MB; static assets free and unlimited | No (Free is default) | Isolates; negligible | Wrangler per package | Express via `httpServerHandler` + `nodejs_compat` flag | Per isolate, evicted any time → not reliable | Daily cap resets at 00:00 UTC; Node compat differences |
| **Fly.io** | Trial only: 2 VM-hours or 7 days; trial machines auto-stop after 5 min | Yes, to keep running | n/a | Dockerfile / `fly.toml` | Container | Single machine possible | Apps stop when trial ends |
| **Koyeb** | 1 free instance (0.1 vCPU / 512 MB, Frankfurt or Washington) | **Yes** ($29 pre-auth hold; sign-up defaults to a paid plan) | Scales to zero after 1 h idle | Buildpacks / Docker | Container | Single instance | Card + plan downgrade friction |
| **Cloud Run** | Free tier needs a billing account; new "Starter Tier" (no card) is driven by Google AI Studio, limits unpublished | Yes (standard) | Scale to zero | Docker / buildpacks | Container | Per instance | Too new/opaque for this use |

## Details per "Must cover" point

### Single service vs split

- **Single (recommended):** Express serves `web/dist` with `express.static` plus an SPA fallback to `index.html`, mounted after the `/api` routes. In Express 5 a bare `'*'` route is invalid, so use `'/{*splat}'` or a final middleware. The client calls the relative path `/api/...`, and the Vite dev server proxies `/api` locally, so there's **no CORS config at all**. Reviewers get one URL and there's one deploy.
- **Split:** the static site gets no cold start on page load, and the API is deployed on its own. You pay with a CORS allowlist (`origin` = static site URL, `allowedHeaders` including `Idempotency-Key`), a preflight on each top-up, `VITE_API_URL` baked in at build time (changing it needs a rebuild), and two services to keep in sync. The important part: the reviewer's first API call is the top-up, so it lands on the cold start.

### Cold starts and the client timeout UX

- A Render cold start (~60 s) is much longer than any sensible client timeout for a payment call (roughly 10-15 s). Without mitigation, a reviewer who leaves the tab open more than 15 min and then tops up gets a **timeout that SnailPay never produced**. That undercuts the timeout scenario we want to show.
- Mitigations, cheapest first:
  1. **Keep-alive ping** to `/api/health` every 10-14 min during the review week, from an external uptime monitor or a scheduled GitHub Actions workflow (timing is best-effort). One always-on free service fits in 750 h/month, as long as no other free service in the workspace uses hours.
  2. **Warm-up on intent:** fire `GET /api/health` when the app boots and again when the top-up form opens, and show a "Connecting to SnailPay…" state until it answers.
  3. **Keep failure modes apart in the UI:** "server waking up, try again" (health check failed or slow) is not the same as "SnailPay timed out" (the documented, simulated scenario).
- Vercel's pre-warming makes this mostly moot there. Railway doesn't sleep unless you opt in.

### CORS and environment configuration

- Same origin: no CORS. Env vars are just `PORT` (Render injects it; bind `0.0.0.0`, default 10000) and whatever SnailPay settings exist.
- Vite only exposes `VITE_*` variables, and it inlines them **at build time**. Never put secrets there.
- If `NODE_ENV=production` is set for the build step, `npm ci` skips devDependencies (`vite`, `typescript`). Set it only at runtime.
- Pin Node with `engines.node` or `.node-version` so the platform's default Node version can't surprise you.

### Monorepo / workspaces build

- **Render:** keep Root Directory = repo root when the API imports a shared workspace package, because files outside the root dir are invisible at build and at runtime. Build with `npm ci && npm run build` (building web + api). Start with `npm run start -w <api-workspace>`. Use build filters to skip deploys for docs-only commits.
- **Vercel:** Root Directory = repo root (or an app dir with "include files outside root" on). Vite is the framework, the Express app is exported from an `api/` function, and `vercel.json` rewrites send `/api/*` to it and everything else to `index.html`.
- **Railway / Netlify:** per-service root or base directory with custom build/start commands. Both work with npm/pnpm workspaces.

### In-memory state (idempotency store, outage/timeout simulation)

- **Render / Railway free:** one instance, so there's no divergence. But the store **resets** on spin-down (15 min idle on Render), on redeploy, and on unplanned restarts. That's acceptable if documented: an idempotency record only needs to outlive a retry burst, which is seconds to minutes.
- **Vercel / Netlify / Workers:** state can differ between instances and disappear without warning. Idempotency becomes best-effort.
- **Design consequences (host-independent):**
  - The **client must own "already credited" dedupe.** Store applied payment ids / idempotency keys in localStorage next to the balance, so a replay after a server reset can never credit twice. The server store is a second line of defense, not the source of truth.
  - **Trigger SnailPay scenarios from the input** (magic card number, name, or amount), not from server-side mutable toggles or env vars. A reviewer on the public URL can't flip an env var, and an in-memory toggle doesn't survive restarts or cross instances. Input-driven triggers are stateless, reproducible from a table in the README, and behave the same on every host.

### Limits that could break the demo during a review week

- **Render:** a ~1 min cold start (mitigated above). An unplanned restart wipes the idempotency store. Suspension if 750 h or 5 GB egress runs out without a card, which isn't realistic for a SPA of a few hundred KB and a handful of reviewers, **unless** a second always-on free service shares the hours.
- **Vercel:** sharing a preview/deployment URL instead of the production domain shows a login wall. Exceeding a Hobby limit pauses the feature for about 30 days. Runtime logs are kept for only 1 h.
- **Railway:** the trial clock starts at sign-up, not at deploy. After 30 days it drops to $1/month, and an always-on service can run that to $0, which stops the workload.
- **Netlify:** 300 credits cover about 20 production deploys; heavy pushing during review week can pause **all** projects. Forum reports show some free teams stuck paused even after the credits reset.
- **All:** don't redeploy during the review window unless it's needed. Every deploy resets in-memory state and may restart the cold-start clock.

## Sources (checked 2026-09-28)

- Render free tier: https://render.com/docs/free
- Render free tier article (no card, Apr 2026): https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026
- Render outbound bandwidth (Hobby 5 GB): https://render.com/docs/outbound-bandwidth
- Render monorepo support: https://render.com/docs/monorepo-support
- Render web services (PORT, 0.0.0.0): https://render.com/docs/web-services
- Render static sites: https://render.com/docs/static-sites
- Vercel pricing: https://vercel.com/pricing
- Vercel Hobby plan (30-day pause): https://vercel.com/docs/plans/hobby
- Vercel fair use (non-commercial, allotments): https://vercel.com/docs/limits/fair-use-guidelines
- Vercel limits: https://vercel.com/docs/limits
- Vercel Functions limits: https://vercel.com/docs/functions/limitations
- Vercel Fluid compute: https://vercel.com/docs/fluid-compute
- Express on Vercel: https://vercel.com/docs/frameworks/backend/express
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection
- Vercel monorepo FAQ: https://vercel.com/docs/monorepos/monorepo-faq
- Railway pricing: https://railway.com/pricing
- Railway free trial: https://docs.railway.com/reference/pricing/free-trial
- Railway plans and resource prices: https://docs.railway.com/reference/pricing/plans
- Railway serverless (app sleeping): https://docs.railway.com/reference/app-sleeping
- Netlify pricing: https://www.netlify.com/pricing/
- Netlify credit-based plans: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Netlify paused projects: https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/
- Netlify Express guide: https://docs.netlify.com/build/frameworks/framework-setup-guides/express/
- Netlify functions configuration (60 s, 1024 MB): https://docs.netlify.com/build/functions/configuration/
- Fly.io pricing: https://docs.fly.io/about/pricing/
- Fly.io free trial: https://docs.fly.io/about/free-trial/
- Koyeb instances (free instance): https://www.koyeb.com/docs/reference/instances
- Koyeb pricing FAQ (card, $29 hold): https://www.koyeb.com/docs/faqs/pricing
- Cloudflare Workers + Express: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Google Cloud free features (billing account): https://docs.cloud.google.com/free/docs/free-cloud-features
- Google Cloud Starter Tier: https://docs.cloud.google.com/docs/starter-tier
