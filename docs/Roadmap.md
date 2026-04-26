# Roadmap

## Project: AI-Driven Investment Intelligence Platform (`investment`)
**Version:** 1.0 · **Date:** 2026-04-22 · **Horizon:** 6 months to GA, 12 months with optional features

---

## 1. Guiding Principles

1. **Data before models.** A reliable, versioned feature store beats any fancy model running on dirty data.
2. **Ship thin, ship end-to-end.** Sprint 1 delivers a trivial signal from real data through the full pipeline before we broaden coverage.
3. **Explainability is a feature.** Every signal must render a human-readable rationale.
4. **Free tier first.** MVP rides on NSE/BSE/AMFI free data; paid sources are additive, not load-bearing.
5. **Async by default.** Long-running jobs are queued; the portal never blocks on ingestion or training.

---

## 2. Milestones at a Glance

| Phase | Duration | Window | Headline |
|---|---|---|---|
| **M0 — Foundation** | 2 wk | 2026-04-22 → 2026-05-05 | Repo, CI, infra skeleton, auth |
| **M1 — Data Layer** | 4 wk | 2026-05-06 → 2026-06-02 | Equities + MF ingestion, feature store |
| **M2 — Analytics & Signals** | 4 wk | 2026-06-03 → 2026-06-30 | Baseline ML, daily signals |
| **M3 — Portal & Reports** | 4 wk | 2026-07-01 → 2026-07-28 | Dashboard, Asset Explorer, Daily Report |
| **M4 — Hardening & Launch** | 3 wk | 2026-07-29 → 2026-08-18 | Perf, security, UAT, v1 GA |
| **M5 — Advanced (optional)** | 8 wk | 2026-08-19 → 2026-10-13 | Backtesting, sentiment, portfolio sim |

---

## 3. Sprint Breakdown (2-week sprints)

### 🏁 M0 · Foundation (Sprints 1–1.5)

**Outcome:** team can merge, deploy and authenticate against a real environment.

- Initialize mono-repo: Next.js 16 + React 19 portal, FastAPI analytics service, shared `docker-compose.yml`
- Enforce folder structure (§7 of SoW) via ESLint custom rule + Pytest layout check
- PostgreSQL 16 + Redis 7 via Docker; Prisma 7 wired to NeonDB staging
- Environment validation with Zod (`src/config/env.ts`)
- Auth (JWT access + refresh), `/auth/*` routes, bcrypt/argon2, refresh-token rotation
- Design system baseline: Tailwind v4 tokens, shadcn/ui install, reactbits primitives wired
- CI (GitHub Actions): lint, type-check, unit tests, build, Docker image push
- Observability: pino logger, request ID middleware, `/admin/health`

**Acceptance**
- `pnpm dev` and `uvicorn analytics.main:app --reload` run on a fresh checkout in under 5 min.
- A new user can register, log in, refresh, and log out through the API.
- CI green on `main`.

### 🧩 M1 · Data Layer (Sprints 2–3)

**Outcome:** 5+ years of clean EOD data for equities, MFs, ETFs, indices, commodities, currency.

**Sprint 2 — Equities + Indices**
- NSE bhavcopy scraper (resilient to format changes, ETag-aware)
- BSE EOD parser
- Equity + index master list with sector/industry mapping
- TimescaleDB hypertable `asset_prices` (compression policy at 90 days)
- Corporate actions ingestion (splits, dividends, bonuses) with price adjustment
- Airflow DAG `ingest_equities_eod` scheduled 19:30 IST daily
- Data quality checks (Great Expectations): row count, null rates, price sanity

**Sprint 3 — MF, ETFs, Commodities, Currency**
- AMFI NAVAll.txt daily ingest, MF master with category & benchmark mapping
- ETF treated as equity with MF-style benchmark
- Commodities (gold, crude) and USD/INR via RBI reference rates
- Data normalization & interpolation rules documented and implemented
- Feature store skeleton: table `features_daily`, idempotent upsert job

**Acceptance**
- Any symbol resolvable to its history range via `/assets/:symbol/history`.
- 5 consecutive daily pipeline runs green, Grafana dashboard live.

### 📊 M2 · Analytics & Signals (Sprints 4–5)

**Outcome:** Daily BUY / HOLD / AVOID signals with confidence scores, per-asset rationale.

**Sprint 4 — Feature engineering**
- Returns: daily, weekly, monthly, rolling (1Y, 3Y, 5Y)
- Risk: stdev, Sharpe, Sortino, max drawdown
- Trend: 20/50/100/200 DMA, RSI-14, MACD(12,26,9)
- Relative strength vs benchmark, volatility, correlation matrix
- Liquidity score, sector rotation indicator
- MF-specific: consistency, downside protection, expense-adjusted return
- Feature-store write path: batch + incremental

**Sprint 5 — Models & recommendation**
- Baseline Logistic Regression pipeline (reproducible, seed-pinned)
- Gradient Boosting (LightGBM) primary model
- Random Forest ensemble
- Signal classifier: BUY / HOLD / AVOID + probability + confidence
- Market regime detector (HMM or rule-based v1)
- Recommendation engine: top-N picks, avoid list, allocation suggestion
- MLflow model registry; retraining DAG (weekly)

**Acceptance**
- `/signals/today` returns ≥ 50 assets with rationale text.
- Offline backtest metric: top-decile beats NIFTY50 by ≥ 2% p.a. on 2020–2025 window (informational, not a gating SLA).

### 🖥️ M3 · Portal & Reports (Sprints 6–7)

**Outcome:** End-users can explore signals, compare assets, read the daily report.

**Sprint 6 — Portal core**
- Route shell: `(auth)`, `(dashboard)` layouts
- Dashboard: Market regime badge, top signals table, quick recommendations
- Asset Explorer: search, type/sector filter, asset detail page with chart (recharts)
- Comparison tool (2–4 assets)
- Signal view with history
- Zustand stores, TanStack Query caching, Axios client with 401→refresh interceptor

**Sprint 7 — Reports + polish**
- Report builder (Markdown → HTML) with sections listed in SoW §5.5
- PDF via weasyprint, S3-compatible storage
- Email digest via SES / Resend (user opt-in)
- LLM narration (Anthropic) with prompt caching, cost caps
- Alerts (signal change, risk): create/list/delete, SSE or polling for events
- Accessibility pass (axe-core), responsive pass

**Acceptance**
- All routes in SoW §8 render without runtime errors.
- Daily report published automatically 5 business days in a row.
- Lighthouse: Performance ≥ 85, Accessibility ≥ 95 on Dashboard and Asset Detail.

### 🛡️ M4 · Hardening & Launch (Sprints 8–9)

**Outcome:** Production-ready v1.0.

- Rate limiting (per-IP + per-user) on all public endpoints
- Input validation 100% via Zod (portal) / Pydantic (analytics)
- CORS, CSRF, CSP headers
- Secrets via AWS Secrets Manager / Doppler; no envs in repo
- Backups: RDS daily snapshots, 7-day PITR, restore drill once
- Load test (k6): 50 concurrent, p95 < 500 ms
- Security audit: Semgrep, Bandit, `npm audit`, OWASP ZAP baseline
- UAT with stakeholders, punch list fix
- Docs: User Manual walkthrough videos (optional)
- Production deploy (AWS ECS Fargate), DNS, TLS, WAF

**Acceptance**
- UAT sign-off from product + client sponsor.
- On-call runbook published; first on-call rotation starts.

### 🚀 M5 · Advanced (optional, Sprints 10–13)

- **Backtesting engine**: vectorized (pandas/numpy), walk-forward splits
- **Strategy simulator**: user-defined rules against historical data
- **Portfolio what-if**: drag-and-drop weights, projected risk/return
- **Sentiment**: NewsAPI + `transformers` pipeline; blend into signal probability
- **Global linkage**: US indices / VIX correlation module
- **Custom rule builder**: DSL + UI for manual overrides

---

## 4. Workstream Owners (to fill)

| Workstream | Owner |
|---|---|
| Frontend | |
| Backend / BFF | |
| Data Engineering | |
| ML / Analytics | |
| DevOps / SRE | |
| QA | |
| Product | |

---

## 5. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | NSE/BSE scraper breaks | High | Med | bhavcopy archive fallback; contract tests daily |
| R2 | AMFI format change | Med | High | parser has schema version + Great Expectations gate |
| R3 | LLM cost spike | Med | Med | prompt caching, daily spend cap, model fallback |
| R4 | Model overfit | High | High | walk-forward CV, out-of-sample holdout, ensemble |
| R5 | Paid API delay from client | Med | Med | MVP designed to work on free tier |
| R6 | Legal/compliance drift | Low | High | “research-only” disclaimer on every report + login |

---

## 6. Definition of Done (per feature)

- Typed end-to-end (TS + Zod, Python + Pydantic)
- Unit tests for services, integration tests for route handlers
- OpenAPI updated, Storybook entry if UI
- Logged with request ID, error handled via central error-handler util
- Feature-flagged for risky rollouts
- Metrics emitted (counter + latency histogram)
- Docs updated (Developer Guide for dev-facing, User Manual for user-facing)

---

## 7. Release Train

- **v0.1 (end of M1)** — internal alpha, data pipelines only
- **v0.5 (end of M2)** — internal beta, signals via API
- **v0.9 (end of M3)** — closed beta, portal live for invited users
- **v1.0 (end of M4)** — public launch
- **v1.x** — advanced features rolled out via M5 sprints

---

## 8. Post-Launch Cadence

- Weekly: model performance review, data quality dashboard triage
- Bi-weekly: product demo + roadmap re-prioritization
- Monthly: cost review (LLM, DB, hosting), security patch window
- Quarterly: full model retrain + portfolio-simulation refresh
