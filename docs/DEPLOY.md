# Deploy Runbook

## Investa · Production deploy on Vercel + Neon Pro + Upstash + Resend + Sentry

**Audience:** the engineer running the first production deploy.
**Time budget:** ~90 min for a clean run, more if you need to wait for DNS.
**Prerequisites:** Vercel, Neon, Upstash, Resend, Sentry accounts (free tiers fine to start; upgrade Neon to Pro for PITR).

---

## 0. Pre-flight checklist

Before you start, run these locally and confirm green:

```bash
npm run typecheck      # tsc --noEmit
npm test               # vitest — 56+ tests passing
npm run audit:prod     # npm audit --omit=dev --audit-level=high
npm run lint --if-present
npm run build          # next build (production bundle)
```

If any of those fail, stop. Fix locally first.

---

## 1. Provision the data plane

### 1a. Neon (Postgres) — upgrade to Pro

The free tier is fine for staging; **Pro is recommended for production** because it gives you:

- Continuous PITR (point-in-time recovery, 7+ days)
- Branching (preview-environment DB per PR — pairs with Vercel previews)
- Higher connection limits

Steps:
1. https://console.neon.tech → your project → **Settings → Plan → Upgrade to Pro**.
2. Settings → **Branches** → keep `main` as production. Optionally create a `staging` branch.
3. Settings → **Connection details** → copy the **pooled** Postgres URL. This is `DATABASE_URL` for serverless.

### 1b. Upstash (Redis, optional but recommended)

Used for distributed rate limiting once you scale beyond one Vercel function instance.

1. https://console.upstash.com → **Create Database** → Region: Mumbai (`ap-south-1`) for India proximity → Plan: **Free**.
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

> Skip if you're shipping single-instance v1 — the in-memory limiter is the fallback.

### 1c. Resend (Email)

1. https://resend.com → **API Keys** → Create.
2. Verify a sending domain (Settings → Domains). The `from:` must be on a domain you control.
3. Copy `RESEND_API_KEY` and decide a `RESEND_FROM` value, e.g. `Investa <no-reply@investa.app>`.

### 1d. Sentry (Errors)

1. https://sentry.io → New Project → **Next.js** platform.
2. Copy the DSN. We're not using their wizard — the SDK is already wired in `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`. Sentry only activates when `SENTRY_DSN` is set.

---

## 2. Repository: prepare main

```bash
git status                # clean working tree
git checkout main && git pull
```

Make sure `prisma/migrations/` is committed (it should be — every migration we ran in dev was tracked).

---

## 3. Vercel: import + configure

### 3a. Create the project

1. https://vercel.com/new → import your repo.
2. Framework: Next.js (auto-detected).
3. **Root Directory:** repo root (leave blank).
4. **Build & Output:** keep defaults — `next build` and `.next/`.
5. Hold off on Deploy until env vars are set.

### 3b. Environment variables

Set under **Project → Settings → Environment Variables** for **Production** (and **Preview** with sensible staging values). Required:

| Var | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `APP_URL` | `https://investa.app` (your domain) | used for password-reset links |
| `DATABASE_URL` | `postgresql://…neon.tech/neondb?sslmode=require&channel_binding=require` | Neon **pooled** URL |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` | ≥ 32 chars |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` | ≥ 32 chars, different from access |
| `JWT_ACCESS_TTL` | `15m` | |
| `JWT_REFRESH_TTL_DAYS` | `30` | |
| `COOKIE_DOMAIN` | `.investa.app` | leading dot for subdomains |
| `COOKIE_SECURE` | `true` | HTTPS-only in prod |
| `CRON_SECRET` | `openssl rand -hex 32` | Vercel Cron sends `Authorization: Bearer $CRON_SECRET` |

Recommended:

| Var | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | else email falls back to stub mode |
| `RESEND_FROM` | `Investa <no-reply@investa.app>` | must match verified domain |
| `SENTRY_DSN` | from Sentry | else error capture is off |
| `SENTRY_ENVIRONMENT` | `production` | |
| `APP_VERSION` | `${{ vercelGitCommitSha[:7] }}` | tagged in Sentry events |
| `UPSTASH_REDIS_REST_URL` | from Upstash | else in-memory limiter |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash | |
| `LOG_LEVEL` | `info` | |
| `LLM_DAILY_BUDGET_USD` | `5` | future use |

### 3c. Cron schedules

`vercel.json` already declares 6 cron jobs:

```
18:00 IST  /api/cron/ingest-yahoo       (Mon–Fri)
19:30 IST  /api/cron/ingest-nse         (Mon–Fri)
22:00 IST  /api/cron/ingest-amfi        (daily)
22:30 IST  /api/cron/analytics-run      (daily)
23:00 IST  /api/cron/reports-build      (daily)
23:15 IST  /api/cron/alerts-evaluate    (daily)
```

Vercel automatically registers them on deploy. Verify under **Project → Settings → Crons**. They authenticate via the `CRON_SECRET` you set above (Vercel injects `Authorization: Bearer $CRON_SECRET` for you).

---

## 4. Run migrations against production Neon

> **Run this once** before the first deploy. Do **not** add it to the build command — runtime migrations on every cold start are an anti-pattern.

From your laptop with the production `DATABASE_URL` in a temporary env:

```bash
DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require' \
  npx prisma migrate deploy
```

Then optionally seed the demo user + 3 demo reports + 3 demo alerts:

```bash
DATABASE_URL='...' npx prisma db seed
```

The seed is idempotent (uses `upsert`); safe to re-run.

---

## 5. Deploy

In the Vercel dashboard, click **Deploy**. The first build will:

- `npm ci` (clean install)
- `npx prisma generate` (Prisma client)
- `next build` (production bundle)

Watch for build errors. If `Invalid environment variables` shows up, double-check Step 3b.

---

## 6. DNS / domain

1. Vercel → Project → Settings → Domains → Add `investa.app` (and `www.investa.app`).
2. Update your registrar to point to the Vercel nameservers (or set `A`/`CNAME` per Vercel's instructions).
3. Wait for cert. Typically 30 s for verified domains, longer for fresh.

---

## 7. Post-deploy smoke tests

```bash
APP=https://investa.app

# 1) Status — public, no auth
curl -s "$APP/api/v1/status" | jq
# expect: status=ok, db.status=ok, latency<500ms, lastRuns populated (or null on day 1)

# 2) Login round-trip
curl -s -c /tmp/cj -X POST "$APP/api/v1/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"demo@investa.local","password":"Demo@123"}' | jq

# 3) Authed read
curl -s -b /tmp/cj "$APP/api/v1/auth/me" | jq

# 4) Trigger an ingestion (admin demo only — promote first):
#    psql ... "UPDATE users SET role = 'ADMIN' WHERE email = 'demo@investa.local';"
curl -s -b /tmp/cj -X POST "$APP/api/v1/admin/ingest/yahoo?range=1mo" | jq

# 5) Trigger analytics
curl -s -b /tmp/cj -X POST "$APP/api/v1/admin/analytics/run" | jq

# 6) Build today's report
curl -s -b /tmp/cj -X POST "$APP/api/v1/admin/reports/build" | jq

# 7) Open the UI:
open "$APP/login"
```

Then visually walk every page once: `/`, `/login`, `/register`, `/forgot-password`, `/dashboard`, `/for-you`, `/assets`, `/assets/RELIANCE`, `/compare`, `/signals`, `/reports`, `/reports/$(date +%Y-%m-%d)`, `/alerts`, `/settings`.

---

## 8. Cron verification

After ~24 h, verify each cron has run:

```bash
curl -s -b /tmp/cj "$APP/api/v1/admin/ingest-log?limit=10" | jq
```

You should see one row per scheduled job per day. Each `triggeredBy: "cron"` confirms Vercel Cron, not a manual run.

If a cron didn't run:
- Vercel → Project → Logs → filter by the cron path.
- Look for 401 (means `CRON_SECRET` mismatch) or 5xx (an actual error).

---

## 9. Uptime monitoring

Point your uptime checker at:

```
GET https://investa.app/api/v1/status
```

Expectations:
- 200 with `status: "ok"` when healthy
- 503 when DB is down (the endpoint still responds; load balancer marks the deployment unhealthy)
- Recommended check interval: 60 s

BetterStack, Pingdom, UptimeRobot all work. Free tiers are sufficient.

---

## 10. Backup / restore drill

Once a quarter:

1. Neon → Branches → create a branch from a PITR timestamp 24 h ago.
2. Connect to the branch, run `SELECT count(*) FROM users` — confirm sane.
3. Drop the branch.

Doing this once before launch is the only way to know your backups work.

---

## 11. Security checklist (before public launch)

- [ ] `npm run audit:prod` clean (no high+ in production deps)
- [ ] OWASP ZAP baseline scan against staging URL — no high findings
- [ ] All env vars in Vercel are marked **Sensitive** for the secrets
- [ ] `JWT_*_SECRET` are unique per environment
- [ ] `COOKIE_SECURE=true` and `COOKIE_DOMAIN` set
- [ ] CSP headers visible in browser DevTools (`/api/v1/status` will include them)
- [ ] Rate limit headers (`X-RateLimit-*`) visible on auth endpoints
- [ ] Sentry receiving events (trigger a 500 from staging and confirm)
- [ ] Resend sending real email (try forgot-password against your own address)
- [ ] PITR / snapshot restore drill done at least once

---

## 12. Rollback

Vercel keeps every deployment. To roll back:

1. Vercel → Deployments → find the last known-good build.
2. Click **⋯ → Promote to Production**.

Database migrations are **forward-only**. If you need to revert a destructive migration, use Neon's PITR to restore a branch from before the migration.

---

## 13. Common gotchas

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 on every page load with `Invalid environment variables` | Missing or empty env in Vercel | Re-check Step 3b; redeploy |
| Auth works locally but fails in prod with no cookie set | `COOKIE_SECURE=true` but you're testing on `http://` | Use HTTPS, or flip `COOKIE_SECURE=false` for staging only |
| `/forgot-password` says success but no email arrives | Resend domain not verified, or `RESEND_FROM` mismatched | Verify domain in Resend dashboard |
| Cron returns 401 | `CRON_SECRET` not set in Vercel | Set it; redeploy |
| Cron runs but no data appears | Cron ran on weekend (NSE/Yahoo are M–F only) — that's expected | Check `vercel.json` cron string |
| Sentry not receiving events | `SENTRY_DSN` blank | Set DSN; redeploy |

---

## 14. What's deferred (not blocking v1 ship)

- LLM narration for daily reports (Anthropic Sonnet 4.6 — drop-in when ready)
- v1 ML signal ensemble (LightGBM in Python — needs separate FastAPI service)
- BSE bhavcopy + corporate-action ingestion
- Watchlist feature
- Personal API tokens
- 2FA (TOTP)

Each of these is documented in `docs/ntc.md` PART 2.

---

*Last updated: 2026-04-26 · Phase G ready for deploy*
