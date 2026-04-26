# Update — 2026-04-26 · All credentials wired · Vercel deploy ready

This is the final, canonical paste-block for the Vercel deploy. Sentry is intentionally skipped (env-guarded — easy to add later).

---

## What's already wired

- ✅ Code at `git@github.com:Tatu1984/investa.git` · `main` · commit `105ac12` (Vercel build fixes included)
- ✅ Neon DB migrated + seeded · demo user `demo@investa.local` / `Demo@123` (ADMIN)
- ✅ Upstash Redis verified — `/api/v1/status` shows `rateLimit.backend: "upstash"`
- ✅ Resend SDK initialised — `/api/v1/status` shows `email: "resend"`
- ✅ JWT + cron secrets generated

---

## A. Vercel deploy — exact steps

1. **https://vercel.com/new** → Import Git Repository → select `Tatu1984/investa`
2. Framework: **Next.js** (auto-detected, leave defaults)
3. Root Directory: blank · Build / Output / Install commands: leave defaults
4. **Don't click Deploy yet.** Expand **Environment Variables** and paste every row from §B.
5. For each var: tick **Production** (and Preview if you want preview deploys to work). For 🔒 marked rows, also tick **Sensitive**.
6. **Deploy.** First build ~2–3 min.
7. **Project → Settings → Cron Jobs** — verify all 6 jobs are listed as Enabled.

---

## B. The full Vercel env-var paste-block (copy verbatim)

> All 15 vars below. No Sentry per your decision. Mark 🔒 rows as **Sensitive** in Vercel.

| Name | Value | Sensitive? |
|---|---|---|
| `NODE_ENV` | `production` | no |
| `APP_URL` | `https://investa.infinititechpartners.com` | no |
| `APP_VERSION` | `v1.0.0` | no |
| `DATABASE_URL` | `postgresql://neondb_owner:npg_c5wGXDJg6oPp@ep-green-fog-amskjluc-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` | 🔒 |
| `JWT_ACCESS_SECRET` | `yMAtzxS8PoTUsKR5OrdJ51BL8MfxtivHq0zE/vceNKwgE+pI0HYz7lDqoCDIkNrn` | 🔒 |
| `JWT_REFRESH_SECRET` | `SRhvmyyBsDUI41jxaN67lDjyBwrrs6JUVeaHK3X30Uud0wBBO1vIEH4CvEuV4Fvy` | 🔒 |
| `JWT_ACCESS_TTL` | `15m` | no |
| `JWT_REFRESH_TTL_DAYS` | `30` | no |
| `COOKIE_DOMAIN` | *(leave blank)* | no |
| `COOKIE_SECURE` | `true` | no |
| `CRON_SECRET` | `2e54437ed169a4e218932793a9cb17a97e432876c1d0f937c1794e1ba41c0cd7` | 🔒 |
| `LOG_LEVEL` | `info` | no |
| `LLM_DAILY_BUDGET_USD` | `5` | no |
| `UPSTASH_REDIS_REST_URL` | `https://liberal-worm-107074.upstash.io` | no |
| `UPSTASH_REDIS_REST_TOKEN` | `gQAAAAAAAaJCAAIgcDFmYzEyYjg0MzZiMjY0OWI3YWIwMmFkYTYyMDk4ZTRmNQ` | 🔒 |
| `RESEND_API_KEY` | `re_PERaC2Nd_MZX9XRyTzipQA2zUinRLnVBZ` | 🔒 |
| `RESEND_FROM` | `Investa <no-reply@investa.infinititechpartners.com>` | no |

> `COOKIE_DOMAIN` left blank intentionally. With it blank, cookies are scoped to the exact host (`investa.infinititechpartners.com`), which is the safest default for a single-subdomain deploy. If you later add e.g. `api.investa.infinititechpartners.com`, switch to `.infinititechpartners.com`.

---

## C. Two things to do in DNS *before* email and the domain work

These don't block the Vercel deploy — the app comes up immediately on `https://investa-xxxx.vercel.app`. But for `investa.infinititechpartners.com` to resolve and emails to deliver, do these in your `infinititechpartners.com` DNS panel.

### C.1 — Point the subdomain at Vercel (~2 min + 5–60 min DNS propagation)

After the first Vercel deploy:

1. **Vercel → Project → Settings → Domains → Add** → enter `investa.infinititechpartners.com`
2. Vercel shows a **CNAME** record to add. Typical value: `cname.vercel-dns.com` for the subdomain.
3. In your DNS panel for `infinititechpartners.com`, add:
   ```
   Type:  CNAME
   Name:  investa
   Value: cname.vercel-dns.com
   TTL:   auto / 3600
   ```
   *(If your DNS is on Cloudflare, set the proxy status to **DNS only** — grey cloud — so Vercel handles the cert directly.)*
4. Back in Vercel → Domains, click **Refresh** until status goes green. Cert auto-issues from Let's Encrypt within minutes.

### C.2 — Verify the sending domain in Resend (~5 min + DNS propagation)

So that `from: no-reply@investa.infinititechpartners.com` actually delivers (otherwise Resend rejects the send and our adapter logs the failure to `sent_emails`):

1. **https://resend.com/domains → Add Domain**
2. Enter `infinititechpartners.com` (the parent — covers all subdomains for sending)
3. Resend shows ~4 DNS records:
   - **MX** for `send.infinititechpartners.com`
   - **TXT** SPF
   - **TXT** DKIM
   - **TXT** DMARC (optional but recommended)
4. Add each in your `infinititechpartners.com` DNS panel exactly as shown
5. Click **Verify** in Resend — usually 30 s to ~2 h
6. Once green, the API key already in Vercel works immediately

> **Until §C.2 is done:** Resend will reject the API call → our `sendEmail()` catches the error → stores a row in `sent_emails` with `status="failed"` and the error message. Visible at `GET /api/v1/admin/emails`. Daily-report and password-reset emails simply won't deliver until verification completes — no app crash.

---

## D. After Vercel deploy is green

Smoke-test the live URL. Initially you'll get `https://investa-xxxx.vercel.app`. Once §C.1 finishes, also test `https://investa.infinititechpartners.com`.

```bash
APP=https://investa.infinititechpartners.com   # or your vercel.app preview URL

# Public status — no auth
curl -s "$APP/api/v1/status" | jq
# Expect: status=ok, db.status=ok, rateLimit.backend=upstash, email=resend

# Login as the seeded ADMIN demo user
curl -s -c /tmp/jar -X POST "$APP/api/v1/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"demo@investa.local","password":"Demo@123"}' | jq

# First ingestion (Yahoo is fastest, ~12s)
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/ingest/yahoo?range=1mo" | jq

# Run analytics → real BUY/HOLD/AVOID signals + regime
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/analytics/run" | jq

# Build today's report
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/reports/build" | jq

# Trigger a fake alert event (after at least one analytics run)
curl -s -b /tmp/jar -X POST "$APP/api/v1/admin/alerts/evaluate" | jq
```

Then walk every page: `/`, `/login`, `/dashboard`, `/for-you`, `/assets`, `/assets/NIFTY50`, `/compare`, `/signals`, `/reports`, `/reports/$(date +%Y-%m-%d)`, `/alerts`, `/settings`, `/forgot-password`.

The 6 daily Vercel Cron jobs (Yahoo / NSE / AMFI ingestion · Analytics · Reports build · Alerts evaluate) start firing on their IST schedule from tomorrow.

---

## E. Optional next steps (do anytime)

- **BetterStack uptime** — `https://betterstack.com` → Create monitor on `https://investa.infinititechpartners.com/api/v1/status` → expect `"status":"ok"` → 60-s interval. 10 free monitors.
- **Sentry** — wire `SENTRY_DSN` env var anytime later, redeploy, errors start centralising. No code change needed.
- **Anthropic LLM narration** for daily reports — set `ANTHROPIC_API_KEY` env var; needs a small code addition (Phase E+ optional).

---

## F. Status of every credential / system

| Item | Status |
|---|---|
| GitHub repo | ✅ pushed `main` |
| Neon DB | ✅ migrated + seeded · ADMIN demo user |
| Upstash Redis | ✅ verified (status endpoint shows `backend: upstash`) |
| Resend API key | ✅ valid · domain verification pending in §C.2 |
| Domain | ⏳ DNS step in §C.1 |
| Vercel deploy | ⏳ paste §B and click Deploy |
| Sentry | ⏭️ skipped (env-guarded; easy to add later) |
| BetterStack | ⏭️ optional |

---

*Last updated 2026-04-26 with all credentials wired.*
