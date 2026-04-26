# Update — 2026-04-26 · Code pushed to GitHub · Vercel deploy ready

This document captures what I did during this session to ship the codebase to GitHub and prepare it for a one-click Vercel deploy. Keep it next to `docs/DEPLOY.md` as the single-page reference for the upcoming deploy.

---

## What just happened

1. **Switched DATABASE_URL** in `.env.local` to the new Neon project: `ep-green-fog-amskjluc-pooler.c-5.us-east-1.aws.neon.tech/neondb`.
2. **Migrated the new Neon DB** — all 3 migrations applied:
   - `20260422162902_init`
   - `20260423180444_add_ingest_log`
   - `20260424094841_add_password_reset_and_sent_email`
3. **Seeded** the demo data (idempotent): demo user (`demo@investa.local` / `Demo@123`), 3 demo reports, 3 demo alerts, today's market regime.
4. **Promoted the demo user to ADMIN** via `prisma db execute`.
5. **Init'd a fresh git repo** scoped to `/Users/sudipto/Desktop/projects/investment` (the previous `.git` was the parent VMS/videostream repo and pointed at the wrong remote).
6. **Hardened `.gitignore`** to exclude all `.env*` (except `.env.example`), `node_modules`, `.next`, `playwright-report/`, `test-results/`, `coverage/`.
7. **Pushed clean** to `git@github.com:Tatu1984/investa.git` — single commit, 208 files, `main` branch tracking `origin/main`.
8. **Generated production secrets** locally (JWT access + refresh + cron secret) — values are in §B below.

Verified safe before push: `git diff --cached --name-only | grep -E "\.env\b|node_modules"` returned only `.env.example`.

---

## A. Vercel deploy — exact steps

When you're ready (everything is now ready on the GitHub side):

1. Go to **https://vercel.com/new** → click **Import Git Repository** → select `Tatu1984/investa`.
2. **Configure Project** screen:
   - **Framework Preset:** Next.js (auto-detected — leave as-is)
   - **Root Directory:** *blank* (it's the repo root)
   - **Build / Output / Install commands:** keep defaults
3. **Don't click Deploy yet.** Expand **Environment Variables** and paste each row from §B.
4. For each var: tick **Production** (and Preview if you want preview deploys to work). For the ones marked 🔒 below, also tick **Sensitive** so they're hidden in the dashboard.
5. Click **Deploy**. First build takes ~2–3 min. Wait for the green checkmark.
6. **Project → Settings → Cron Jobs** — verify all 6 jobs are listed as "Enabled" (auto-detected from `vercel.json`).

---

## B. Required env vars (works without Resend / Sentry / Upstash)

Paste each row into Vercel:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://your-domain.app` *(use the Vercel preview URL, e.g. `https://investa-xxxx.vercel.app`, until your real domain DNS is set up)* |
| `APP_VERSION` | `v1.0.0` |
| 🔒 `DATABASE_URL` | `postgresql://neondb_owner:npg_c5wGXDJg6oPp@ep-green-fog-amskjluc-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| 🔒 `JWT_ACCESS_SECRET` | `yMAtzxS8PoTUsKR5OrdJ51BL8MfxtivHq0zE/vceNKwgE+pI0HYz7lDqoCDIkNrn` |
| 🔒 `JWT_REFRESH_SECRET` | `SRhvmyyBsDUI41jxaN67lDjyBwrrs6JUVeaHK3X30Uud0wBBO1vIEH4CvEuV4Fvy` |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL_DAYS` | `30` |
| `COOKIE_DOMAIN` | *leave blank for now (set after you have a domain, e.g. `.investa.app`)* |
| `COOKIE_SECURE` | `true` |
| 🔒 `CRON_SECRET` | `2e54437ed169a4e218932793a9cb17a97e432876c1d0f937c1794e1ba41c0cd7` |
| `LOG_LEVEL` | `info` |
| `LLM_DAILY_BUDGET_USD` | `5` |

The 6 Vercel cron jobs in `vercel.json` will auto-register on first deploy and authenticate using the `CRON_SECRET` above.

---

## C. Optional env vars (each is env-guarded — paste when you have them)

| Name | What it does without it |
|---|---|
| `UPSTASH_REDIS_REST_URL` | falls back to in-memory rate limit (per-instance) |
| 🔒 `UPSTASH_REDIS_REST_TOKEN` | same |
| 🔒 `RESEND_API_KEY` | email captures to `sent_emails` DB table without delivering |
| `RESEND_FROM` | same |
| `SENTRY_DSN` | errors are logged but not centralised |
| `SENTRY_ENVIRONMENT` | same |

App is fully functional without them — they unlock production-grade behaviour.

---

## D. What you need to send back

### D.1 — Upstash (already have an account)

The string `0fcec1cf-6eb3-436b-ade8-8813a08505e3` is the **database ID**, not the credentials we need. Grab the actual REST URL + Token:

1. **https://console.upstash.com/redis**
2. Click into the database whose ID matches that UUID
3. **Details** tab → scroll to **REST API**
4. Send me both fields:
   - `UPSTASH_REDIS_REST_URL=https://xxxxx-region.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN=A...long...token...`

> If the database isn't in `ap-south-1` (Mumbai), delete it and recreate there for India proximity. Free tier is fine.

### D.2 — Resend (~15 min)

1. **https://resend.com/signup** → sign up (Google or email)
2. **Settings → Domains → Add Domain** — use a domain you own (or buy one, see §D.4)
3. Resend shows ~4 DNS records (SPF, DKIM, return-path) → add them in your registrar's DNS panel
4. Click **Verify** — 30 s to ~2 h
5. **API Keys → Create API Key** → name `investa-prod` → permission **Sending access** → select your verified domain
6. Copy the key (starts with `re_…`) — **shown only once**
7. Send me back:
   - `RESEND_API_KEY=re_...`
   - `RESEND_FROM=Investa <no-reply@your-domain.app>`

The `from:` MUST be on a verified domain. You can't send from gmail/local addresses.

### D.3 — Sentry (~10 min)

1. **https://sentry.io/signup/** → sign up
2. **Projects → Create Project** → Platform: **Next.js** (important — gives correct DSN format) → name `investa-portal` → Continue
3. **Skip** their setup wizard — the SDK is already wired in our codebase
4. **Settings → Projects → investa-portal → Client Keys (DSN)** → copy the **DSN** value (looks like `https://abc123@o12345.ingest.us.sentry.io/67890`)
5. Send me back:
   - `SENTRY_DSN=https://abc123@o12345.ingest.us.sentry.io/67890`

### D.4 — Domain (only if you don't have one)

Pick a registrar:
- **Cloudflare Registrar** — at-cost pricing, no upsells (₹800–₹1,500/yr)
- **Namecheap** — slightly cheaper for first year, easier UX
- **Porkbun** — also good

Buy a `.app` (HTTPS-enforced), `.in`, or `.io` domain. Tell me the name when bought and I'll wire DNS + cookies + Resend `from:` to it.

### D.5 — BetterStack uptime (optional, ~5 min, after deploy is live)

1. **https://betterstack.com** → sign up (10 free monitors)
2. **Uptime → Create Monitor** → URL: `https://your-domain.app/api/v1/status` → interval 60 s → Required text: `"status":"ok"`
3. Add your email/Slack for alerts

No env var to share — purely external.

---

## E. After deploy is green

I'll do a smoke test against your live URL. Walk every page once:
- `/`, `/login`, `/register`, `/forgot-password`
- `/dashboard`, `/for-you`, `/assets`, `/assets/RELIANCE`, `/compare`, `/signals`
- `/reports`, `/reports/<today>`, `/alerts`, `/settings`
- `/api/v1/status` (should return JSON with `status: "ok"`)

Login: `demo@investa.local` / `Demo@123` (already promoted to ADMIN in Neon).

Trigger a manual ingestion + analytics + report build (now that we're on the cloud):

```bash
APP=https://your-vercel-url.vercel.app
curl -s -c /tmp/jar -X POST "$APP/api/v1/auth/login" -H 'content-type: application/json' \
  -d '{"email":"demo@investa.local","password":"Demo@123"}' > /dev/null
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/ingest/yahoo?range=1mo" | jq
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/analytics/run" | jq
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/reports/build" | jq
```

Then `/dashboard`, `/for-you`, `/reports/$(date +%Y-%m-%d)` should all show real data.

---

## F. Reminder of what's already done

- ✅ Code pushed to `git@github.com:Tatu1984/investa.git` (commit `3af3e2b`)
- ✅ Neon DB migrated + seeded
- ✅ Demo user promoted to ADMIN
- ✅ JWT secrets + cron secret generated
- ⏳ Vercel deploy (you do this — import repo, paste env vars from §B, click Deploy)
- ⏳ DNS / domain (whenever you have one)
- ⏳ Resend / Sentry / Upstash (optional, env-guarded — paste when you have keys)

---

*Generated 2026-04-26 by the deploy session. Update if anything changes.*
