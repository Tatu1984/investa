# Project TODO · Progress Tracker

**Project:** AI-Driven Investment Intelligence Platform (`investment`)
**Roadmap reference:** [`docs/Roadmap.md`](Roadmap.md)
**Convention:** `[x]` done · `[~]` in progress · `[ ]` pending · `[!]` blocked
**Update this file at the end of every working session.**

---

## At a glance

| Phase | Window | Status | % done |
|---|---|---|---|
| Docs & UI prototype | 2026-04-22 | ✅ complete | 100% |
| M0 · Foundation (backend scaffolding) | 2026-04-22 → 2026-05-05 | ✅ complete | 100% (Neon live, seed green, auth round-trip green) |
| M1 · Data Layer (real APIs + real ingestion) | 2026-04-23 → 2026-06-02 | ✅ complete | 100% (30+ APIs · cron · all 13 pages live) |
| Phase A · Security hardening | 2026-04-23 | ✅ complete | 100% |
| Step 1 · Scheduler + IngestLog | 2026-04-24 | ✅ complete | Vercel Cron wired for AMFI/NSE/Yahoo |
| Step 2 · Kill the mocks | 2026-04-24 | ✅ complete | All 13 pages on Neon · mocks deleted |
| Phase D v0 · Rule-based signal engine | 2026-04-24 | ✅ complete | Features + signals + regime live · 6.5 s end-to-end |
| Phase E · Reports + PDF + email + forgot-password | 2026-04-24 | ✅ complete | Template reports · PDF · Resend+stub · full reset round-trip |
| Phase F · Alerts evaluator | 2026-04-26 | ✅ complete | 3 rule types · per-day idempotent · UI feed + 30 s polling + bell badge |
| Phase G · Tests + observability + deploy prep | 2026-04-26 | ✅ code-complete | Sentry · Upstash adapter · 56 unit tests · 3 e2e specs · CI matrix · DEPLOY.md · /status |
| Production deploy | TBD | ⏳ ready | Follow `docs/DEPLOY.md` — ~90 min runbook |
| M2 · Analytics & Signals | 2026-06-03 → 2026-06-30 | ⏳ not started | 0% |
| M3 · Portal & Reports (backend side) | 2026-07-01 → 2026-07-28 | ⏳ not started | 0% |
| M4 · Hardening & Launch | 2026-07-29 → 2026-08-18 | ⏳ not started | 0% |
| M5 · Advanced (optional) | 2026-08-19 → 2026-10-13 | ⏳ not started | 0% |

---

## ✅ Session 2026-04-22 — Docs & UI prototype (DONE)

**Documentation (delivered in `.md` + `.docx`)**
- [x] Statement of Work (`docs/SoW.md`, `docs/SoW.docx`)
- [x] Roadmap (`docs/Roadmap.md`, `docs/Roadmap.docx`)
- [x] Developers Guide (`docs/Developers-Guide.md`, `.docx`)
- [x] User Manual (`docs/User-Manual.md`, `.docx`)

**UI scaffolding (Next.js 16 + React 19 dev server on :3000)**
- [x] Claude-style design tokens (OKLCH palette, dark mode variant, serif display)
- [x] shadcn-style primitives: Button, Card, Input, Label, Badge, Separator, Table, Tabs, Avatar, Switch, Select, Dialog, MetricTile
- [x] reactbits-style motion: FadeIn, Stagger, GradientBlob, ShinyText, NumberFlow
- [x] App shell — Sidebar (with pinned "For you" primary CTA), Topbar, PageHeader
- [x] Auth: `/login`, `/register` with Zustand-persisted auth store
- [x] Landing page `/` with animated hero + preview card + feature grid
- [x] Dashboard `/dashboard` — KPI tiles, NIFTY 50 chart, Market Regime, Top BUYs, Allocation, Sector Strength, Avoid list, + "For you" banner
- [x] Assets `/assets` — filter pills + search + AI-score table
- [x] Asset detail `/assets/[symbol]` — 5 tabs (Overview, Price, Metrics, Signal History, Corp Actions)
- [x] Compare `/compare` — up to 4 assets, normalized % chart + metrics matrix
- [x] Signals `/signals` — grouped tables + Performance ledger
- [x] Reports `/reports`, `/reports/[date]` — latest summary + archive + full sectioned view
- [x] Alerts `/alerts` — interactive table with Switch + delete
- [x] Settings `/settings` — Profile / Security / Notifications / Appearance (dark mode) / API keys

**"For you" — plain-English plan builder (added in same session)**
- [x] `/for-you` route with 3-question wizard (amount, horizon, risk)
- [x] Auto-generated plan: rupee-split across Growth / Safe / Hedge
- [x] Per-pick cards with plain-language rationale, rupee amount, hold duration, confidence %
- [x] Plain-English avoid list
- [x] Plain-English market-regime read
- [x] `useUiStore` (Zustand + localStorage persist) for amount / horizon / risk
- [x] Prominent sidebar CTA for `/for-you` + dashboard banner

**Folder structure (per SoW §7)**
- [x] `src/app/` — route handlers + `(auth)` / `(app)` groups
- [x] `src/frontend/{components,hooks,store,utils}/`
- [x] `src/shared/{types,mocks,constants}/`
- [x] Mock data (15 assets, signal history, corp actions, 3 reports, alerts, regime, sectors)

**Smoke test (all 13 routes return 200 with expected content)**
- [x] `/`, `/login`, `/register`
- [x] `/for-you`, `/dashboard`, `/assets`, `/assets/RELIANCE`, `/compare`, `/signals`, `/reports`, `/reports/2026-04-22`, `/alerts`, `/settings`

---

## 🟡 M0 · Foundation · 2026-04-22 → 2026-05-05

**Outcome:** real backend, real auth, local Docker environment.

**Tooling & infra**
- [x] `docker-compose.yml` for Postgres 16 + Redis 7 + MailHog (MLflow deferred to M2)
- [x] Install dev deps: `prisma`, `@prisma/adapter-pg`, `@prisma/client`, `zod`, `jose`, `argon2`, `pino`, `pino-http`, `nanoid`, `@tanstack/react-query`, `axios`
- [ ] Package manager decision — we stayed on **npm** (existing lockfile). Revisit before CI.
- [ ] `just` task runner (deferred — not blocking)

**Environment validation**
- [x] `src/config/env.ts` — Zod schema, empty-string → undefined safety for optional vars
- [x] `.env.example` committed; `.env.local` bootstrapped from it
- [ ] `.env.production` template (will add during M4 hardening)

**Database**
- [x] Prisma 7 schema in `src/backend/database/prisma/schema.prisma` with ALL 14 models
  (`User`, `RefreshToken`, `Asset`, `AssetPrice`, `MfNav`, `CorporateAction`, `FeaturesDaily`, `SignalsDaily`, `MarketRegime`, `Report`, `Alert`, `AlertEvent`, `AuditLog`, enums)
- [x] `prisma.config.ts` (Prisma 7 style — URL lives here, not in schema)
- [x] `src/backend/database/client.ts` (PrismaPg driver adapter, dev-friendly global cache)
- [x] `src/backend/database/seed.ts` (demo user `demo@investa.local / Demo@123` + assets + today's signals + regime)
- [x] `npx prisma generate` succeeds (client at `node_modules/.prisma/client`)
- [x] NeonDB URL pasted, `prisma migrate dev --name init` → schema live in Neon
- [x] `prisma db seed` → demo user + 16 assets + today's signals + regime
- [x] Demo user promoted to ADMIN via `prisma db execute` — `/admin/health` returns 200 with `dbLatencyMs`
- [ ] Hypertable migration SQL for `asset_prices` and `mf_nav` (deferred to M1 when we start ingesting real prices)

**Auth**
- [x] Zod validators: register, login, forgot-password, reset-password
- [x] Repositories: `user.repository.ts`, `refresh-token.repository.ts`
- [x] `AuthService` — register, login, refresh (with rotation), logout, me
- [x] Middleware: `withApi`, `withAuth`, `withAdmin` — all thread requestId + problem+json
- [x] `POST /api/v1/auth/register` — smoke 422 works (empty body → structured error)
- [x] `POST /api/v1/auth/login`
- [x] `POST /api/v1/auth/refresh` (rotates refresh token)
- [x] `POST /api/v1/auth/logout` — clears cookies + revokes server-side
- [x] `GET /api/v1/auth/me` — smoke 401 works (no cookie → "Missing access token")
- [x] HttpOnly / Secure / SameSite cookies via `cookies.util.ts`
- [x] Frontend: `axios` client with 401→`/auth/refresh`→retry-once interceptor
- [x] `LoginForm` + `RegisterForm` rewired to real API + Axios error surfacing
- [x] Topbar logout button calls `/auth/logout` then clears Zustand + redirects
- [ ] `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password` (deferred — needs email service)

**FastAPI analytics service skeleton (deferred to M1 start)**
- [ ] Install Python 3.12 (machine has 3.9.6) and `uv`
- [ ] `services/analytics/` with `pyproject.toml` — FastAPI, SQLAlchemy, Alembic, pandas, numpy
- [ ] `GET /health` (liveness + readiness)
- [ ] Internal `X-Internal-Key` middleware (never exposed to browser)
- [ ] Structured logging (structlog) with request IDs

**Observability (baseline)**
- [x] pino logger with redacted fields
- [x] request-id middleware (`req_<nanoid>`)
- [x] `GET /api/v1/health` — public liveness, returns `x-request-id`
- [x] `GET /api/v1/admin/health` — admin-gated DB ping (Prisma `SELECT 1` + latency)
- [ ] `/metrics` Prometheus endpoint (deferred — comes with hosting in M4)

**CI/CD**
- [x] `.github/workflows/ci.yml` — Postgres service, prisma generate, lint, `tsc --noEmit`, `next build` on PR
- [ ] ESLint custom rule enforcing folder structure (nice-to-have — deferred)

**Acceptance gate for M0**
- [x] `npx tsc --noEmit` clean
- [x] Every existing UI route still 200 (13 routes verified)
- [x] `/api/v1/health` returns 200 JSON
- [x] `/api/v1/auth/me` (no cookie) returns 401 `application/problem+json` with `x-request-id`
- [x] `/api/v1/auth/register` validation errors return 422 with field-level paths
- [x] **Full round-trip against Neon:** login → cookie issued → `/auth/me` returns user → `/auth/refresh` rotates → `/auth/me` still works → `/auth/logout` clears → `/auth/me` returns 401
- [x] `/api/v1/admin/health` returns 200 with live `dbLatencyMs` after promoting demo user to ADMIN
- [ ] CI green on `main` after first PR (workflow exists; run after first push)

---

## 🟡 M1 · Data Layer · 2026-04-23 → 2026-06-02

**Started early.** Portal is now reading from Neon instead of mock files.

**Read APIs (DB-backed, live)**
- [x] `GET /api/v1/assets` — paginated list with optional `?type=` and `?signal=` filters
- [x] `GET /api/v1/assets/:symbol` — single asset + latest signal
- [x] `GET /api/v1/signals/top?type=BUY&n=10` — ranked by `probability × confidence`
- [x] `GET /api/v1/regime/current`
- [x] Frontend: `QueryProvider` (TanStack Query) wired into the `(app)` layout
- [x] Frontend: `assetsApi`, `regimeApi` endpoints; `/for-you` now reads from them with loading/error states and a Retry button
- [ ] `GET /api/v1/signals/history?symbol=…` — per-asset signal log
- [ ] `GET /api/v1/signals/sector-strength`, `/avoid-list`
- [ ] Wire `/dashboard`, `/assets`, `/assets/[symbol]`, `/compare`, `/signals` to the new endpoints (still on mocks)

**"For you" feature enhancements**
- [x] SIP / one-time toggle (`frequency` field in `useUiStore`, persisted)
- [x] Presets swap between lumpsum (₹10k–₹5L) and SIP (₹1k–₹25k/mo)
- [x] Plan copy morphs: "₹X today" vs "₹X/month for N months" with total committed
- [x] Money bar + pick cards show `/mo` suffix in SIP mode
- [x] Regime headline now reads live regime from Neon

**Sprint 2 — Equities + Indices (ingestion pipeline — NOT STARTED)**
- [ ] NSE bhavcopy scraper (ETag-aware, fallback to archive)
- [ ] BSE EOD parser
- [ ] Equity + index master list with sector/industry mapping
- [ ] Corporate actions ingest (splits, dividends, bonuses) with price adjustment
- [ ] Airflow DAG `ingest_equities_eod` scheduled 19:30 IST
- [ ] TimescaleDB hypertable `asset_prices` with compression at 90 days
- [ ] Great Expectations data-quality suite (row count, null rates, price sanity)

**Sprint 3 — MF, ETFs, Commodities, Currency**
- [ ] AMFI NAVAll.txt daily ingest + MF master with category + benchmark mapping
- [ ] ETFs treated as equity-with-MF-style-benchmark
- [ ] Gold + Crude via MCX / delayed feed
- [ ] USD/INR via RBI reference rates
- [ ] Interpolation / missing-data rules documented + implemented
- [ ] `features_daily` table skeleton with idempotent upsert

**API wiring (replace mocks)**
- [ ] `/api/v1/assets` (paginated, filtered)
- [ ] `/api/v1/assets/search`
- [ ] `/api/v1/assets/:symbol`
- [ ] `/api/v1/assets/:symbol/history`
- [ ] `/api/v1/assets/:symbol/corporate-actions`
- [ ] Replace `mockAssets.ts` usages in the portal with API calls via TanStack Query hooks

**Acceptance gate for M1**
- [ ] 5 consecutive daily pipeline runs green
- [ ] Grafana dashboard shows ingestion health
- [ ] Any symbol resolvable to ≥ 5 years of EOD history

---

## ⏳ M2 · Analytics & Signals · 2026-06-03 → 2026-06-30

**Sprint 4 — Feature engineering**
- [ ] Returns (1d/1w/1m + rolling 1Y/3Y/5Y)
- [ ] Risk: stdev, Sharpe, Sortino, max drawdown
- [ ] Trend: 20/50/100/200 DMA, RSI-14, MACD(12,26,9)
- [ ] Relative strength vs benchmark
- [ ] Volatility, correlation matrix, sector rotation indicator
- [ ] Liquidity score, MF consistency, downside protection, expense-adjusted return
- [ ] Feature-store write path (batch + incremental)

**Sprint 5 — Models + recommendation**
- [ ] Baseline Logistic Regression (seed-pinned, reproducible)
- [ ] LightGBM primary model + Random Forest ensemble
- [ ] Signal classifier BUY / HOLD / AVOID + probability + confidence
- [ ] Market regime detector (HMM or rule-based v1)
- [ ] Top-N picks + avoid list endpoints
- [ ] Allocation suggestion per (risk, horizon) → drives `/for-you`
- [ ] MLflow model registry + weekly retraining DAG

**API wiring**
- [ ] `/api/v1/signals/today`, `/api/v1/signals/:symbol/history`
- [ ] `/api/v1/signals/regime`, `/api/v1/signals/sector-strength`
- [ ] `/api/v1/signals/top-picks`, `/api/v1/signals/avoid-list`
- [ ] `/api/v1/recommendations/allocation`, `/api/v1/recommendations/sector-allocation`, `/entries`, `/exits`
- [ ] Portal: replace mock signal data with these endpoints

**Acceptance gate for M2**
- [ ] `/signals/today` returns ≥ 50 real assets with rationales
- [ ] Offline backtest: top-decile beats NIFTY50 by ≥ 2% p.a. on 2020–2025 window (informational)

---

## ⏳ M3 · Portal & Reports (backend) · 2026-07-01 → 2026-07-28

> Note: UI portal is already built. This milestone hooks it to real data + adds the report engine.

**Reports engine**
- [ ] Report builder Markdown → HTML with all 6 sections
- [ ] weasyprint PDF pipeline, S3 storage
- [ ] Email digest via SES / Resend (opt-in)
- [ ] LLM narration (Anthropic) with prompt caching + daily cost cap
- [ ] `/api/v1/reports` + `/:date` + `/:date/pdf` + `/email` + `/regenerate`

**Alerts**
- [ ] Alert evaluator job (runs after signals pipeline)
- [ ] `/api/v1/alerts` CRUD + `/events`
- [ ] SSE (or polling) channel for real-time alert events in UI

**Portal integration pass**
- [ ] Wire `/dashboard`, `/assets`, `/for-you`, `/signals`, `/reports`, `/alerts` to real endpoints (remove mock imports)
- [ ] Accessibility pass (axe-core, keyboard nav audit)
- [ ] Responsive pass (tables → cards < 768 px)
- [ ] Loading states + Suspense boundaries per route (`loading.tsx`)

**Acceptance gate for M3**
- [ ] Daily report published automatically 5 business days in a row
- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 95 on Dashboard + Asset Detail

---

## ⏳ M4 · Hardening & Launch · 2026-07-29 → 2026-08-18

- [ ] Rate limiting (per-IP + per-user) on public endpoints
- [ ] 100% input validation (Zod portal / Pydantic analytics)
- [ ] CORS allowlist, CSRF, CSP, HSTS headers
- [ ] Secrets via AWS Secrets Manager (no `.env` in prod)
- [ ] RDS daily snapshots, 7-day PITR, one restore drill
- [ ] k6 load test (50 concurrent, p95 < 500 ms on hot paths)
- [ ] Security audit: Semgrep, Bandit, `npm audit`, OWASP ZAP baseline
- [ ] UAT with stakeholders + punch-list fix
- [ ] On-call runbook + first rotation assigned
- [ ] Prod deploy (AWS ECS Fargate + RDS + ElastiCache), DNS, TLS, WAF
- [ ] Status page + SLO doc

**Acceptance gate for M4**
- [ ] UAT sign-off from product + client sponsor
- [ ] Security review clean
- [ ] Observability dashboards green for 7 consecutive days

---

## ⏳ M5 · Advanced · 2026-08-19 → 2026-10-13 (optional)

- [ ] Backtesting engine (vectorized, walk-forward splits)
- [ ] Strategy simulator (user-defined rules)
- [ ] Portfolio what-if simulation (drag-and-drop weights)
- [ ] Sentiment pipeline (NewsAPI + transformers) blended into signal probability
- [ ] Global macro linkage (US / VIX correlation)
- [ ] Custom rule builder (DSL + UI for overrides)

---

## 🧭 How to use this file

1. **At the start of a session:** read the "At a glance" table + the current phase section to know where we are.
2. **While working:** flip `[ ]` to `[~]` on the items you're actively doing.
3. **At the end of the session:** flip `[~]` to `[x]` for what's done, leave `[~]` for partials, add notes under a **Session log** sub-heading if context matters, and update the percentage in the glance table.
4. **If blocked:** flip to `[!]` and add a one-liner explaining the block in the Session log.

---

## 📝 Session log

### 2026-04-22 — UI prototype + "For you" (plain-English plan)
- Delivered all 4 documents in `.md` and `.docx`.
- Scaffolded Next.js 16 portal with Claude-style design tokens, shadcn primitives, reactbits motion.
- Built 13 routes against mock data; dev server verified (all 200s).
- Added `/for-you` — non-financial-user-friendly plan builder (amount + horizon + risk → rupee split + plain-English picks).
- Pinned "For you" as the primary sidebar CTA and added a dashboard banner.

### 2026-04-22 (pm) — M0 · Foundation (backend scaffolding, ~75%)
- Installed backend deps: Prisma 7, jose, argon2, pino, pino-http, nanoid, axios, TanStack Query.
- Added Zod-validated env at `src/config/env.ts` (treats empty optional strings as unset — Zod 4 footgun fixed).
- Prisma 7 schema with 14 models + enums (users, refresh_tokens, assets, asset_prices, mf_nav, corporate_actions, features_daily, signals_daily, market_regime, reports, alerts, alert_events, audit_log). Prisma client generates cleanly.
- Built backend utils: jwt (jose, HS256), hash (argon2id + sha256 + randomToken), logger (pino), request-id (`req_<nanoid>`), error handler (RFC 7807 problem+json), cookies.
- Auth service (register / login / refresh with rotation / logout / me) with repositories, validators, middleware (`withApi`, `withAuth`, `withAdmin`).
- Route handlers live at `/api/v1/auth/{register,login,refresh,logout,me}`, `/api/v1/health`, `/api/v1/admin/health`.
- Frontend wired to real auth: axios client with 401→refresh interceptor, `LoginForm` + `RegisterForm` now hit the real API and surface server errors cleanly; Topbar logout revokes server-side.
- `docker-compose.yml` ready for local infra (Docker not installed on this machine yet).
- `.github/workflows/ci.yml` with Postgres service, prisma generate, typecheck, build.
- Smoke test passing: 13 UI routes + `/api/v1/health` → 200; `/auth/me` → 401 problem+json; `/auth/register` with bad body → 422 with field-level errors; `/auth/login` reaches Prisma (fails at DB connect — expected, placeholder URL).
- FastAPI analytics service deferred (machine has Python 3.9.6; needs 3.12 + uv install).

- **Next session:**
  1. Paste real NeonDB Postgres URL into `.env.local` (set it at `DATABASE_URL`).
  2. `npx prisma migrate dev --name init` → creates the schema in Neon.
  3. `npx prisma db seed` → creates the demo user + assets + today's signals.
  4. Verify full register → login → refresh → logout round-trip with cookies.
  5. Begin **M1 · Data Layer** — NSE bhavcopy scraper, asset master, hypertable migrations (or start M0 FastAPI skeleton if Python 3.12 is installed).

### 2026-04-23 — M0 green end-to-end + real-data APIs + SIP toggle
- NeonDB wired (`DATABASE_URL` in `.env.local`), JWT secrets rotated from placeholders.
- `npx prisma migrate dev --name init` ran clean — schema live in Neon (migration file at `src/backend/database/prisma/migrations/20260422162902_init/`).
- Installed `tsx` + `server-only` as devDeps; removed `server-only` imports from DB-layer files so Prisma seed runs under plain Node (guard still present in `middleware.ts`, `jwt.util.ts`, `cookies.util.ts`).
- `npx prisma db seed` — demo user (`demo@investa.local` / `Demo@123`), 16 assets, today's signals, market regime.
- Verified full auth round-trip against Neon: login issues HttpOnly cookies → `/auth/me` returns user → `/auth/refresh` rotates → `/auth/logout` clears cookies + revokes server-side → `/auth/me` correctly 401s.
- Promoted demo user to ADMIN via `prisma db execute` one-liner; `/admin/health` returns 200 with live `dbLatencyMs` (≈ 297 ms to Neon from local).
- **New REST APIs from Neon** (portal layer): `/api/v1/assets`, `/api/v1/assets/:symbol`, `/api/v1/signals/top`, `/api/v1/regime/current`. All return the `Asset` DTO shape the UI already uses; fields not yet persisted (price, returns, RSI, etc.) come back as 0 until M2's analytics pipeline fills them.
- Added `QueryProvider` (TanStack Query) at the `(app)` layout root; `/for-you` is now reading from the real APIs with skeleton loading, error card + Retry.
- **SIP / one-time:** new `frequency` field in `useUiStore`, asked as the first question in the plan builder; amount presets swap automatically (₹1k–₹25k/mo vs ₹10k–₹5L). In SIP mode the plan header reads "Invest ₹X/month", rupee cards show `/mo`, and a summary card shows total commitment over the horizon (12/36/60 months).
- **Next session:** wire the other pages (`/dashboard`, `/assets`, `/assets/[symbol]`, `/compare`, `/signals`) to the same endpoints (remove the remaining mock imports), then start the real ingestion pipeline (NSE bhavcopy + AMFI NAV → populate `asset_prices`, `mf_nav`, `features_daily`, `signals_daily`).
