# Statement of Work (SoW)

## Project: AI-Driven Investment Intelligence Platform
**Codename:** `investment`
**Document version:** 1.0
**Date:** 2026-04-22
**Prepared for:** Internal Product Team
**Repository:** `/Users/sudipto/Desktop/projects/investment`

---

## 1. Executive Summary

The AI-Driven Investment Intelligence Platform is a multi-asset research and signal-generation system for the Indian capital markets (NSE, BSE, AMFI-tracked mutual funds, ETFs, indices, commodities and currency). It ingests end-of-day (EOD) market data from public and paid sources, computes risk/return/trend analytics, feeds a multi-factor machine-learning engine that produces BUY / HOLD / AVOID signals, and renders the output as a Daily Report and an interactive web portal.

The portal is built on **Next.js 16 (App Router) + React 19** with a clean **Claude-style** minimalist visual language, animated primitives from **reactbits.dev**, and accessible component primitives from **shadcn/ui**. The analytics and ML layer is delivered as a Python FastAPI micro-service that the Next.js backend orchestrates through a secured internal API. Persistence is **PostgreSQL** (TimescaleDB extension for time-series), caching is **Redis**, and scheduling is **Cron / Airflow**.

This document defines the scope, the committed feature list, the technical stack, the repository folder structure, all REST API contracts and frontend routes, and is accompanied by a Roadmap, a Developers Guide, and a User Manual.

---

## 2. Project Objectives

1. Deliver a single source of truth for equity, mutual fund, ETF, index, commodity and currency data for the last 5–10 years.
2. Compute and persist a standardized feature store (returns, volatility, Sharpe, drawdowns, moving averages, RSI, MACD, relative strength).
3. Generate daily, explainable AI signals (BUY / HOLD / AVOID) with a confidence score per asset.
4. Produce an automated, narrative Daily Report (web, PDF, email).
5. Provide an interactive web portal for exploration, comparison, ranking and historical review of signals.
6. Be API-first, observable, role-ready and horizontally scalable from day one.

---

## 3. Target Users

| Persona | Description | Primary Needs |
|---|---|---|
| Retail Investor | Self-directed investor managing a personal portfolio | Daily picks, avoid list, clear explanation |
| Advisor / RIA | Registered investment advisor building model portfolios | Ranking, comparison, allocation suggestions |
| Power User / Quant | Researcher validating ideas | Backtesting, feature store access, raw metrics |
| Admin | Platform operator | User management, data pipeline health, model retraining |

---

## 4. Scope

### 4.1 In Scope (v1 — MVP+)

- Data ingestion for equities, MFs, ETFs, indices, commodities, currency
- Feature engineering and analytics pipeline
- Multi-factor ML scoring engine with ensemble models
- Recommendation engine with top picks, avoid list, allocation suggestions
- Daily Report engine (web, PDF, email digest)
- Web portal: Dashboard, Asset Explorer, Comparison, Signals, Reports, Alerts
- Auth (JWT), RBAC scaffolding, rate-limiting, encryption in transit/at rest
- Observability: structured logs, health checks, metrics

### 4.2 Out of Scope (v1)

- Brokerage order placement / execution
- Real-time tick-level intraday ingestion (stubbed for future)
- Multi-tenant billing / subscription management
- Mobile native apps (web is responsive)
- Regulatory advisory certification (platform is research-only)

### 4.3 Future / Optional (v2+)

- Backtesting engine and strategy simulator
- Portfolio what-if simulation
- News / social sentiment analysis
- Global macro linkage (US → India correlation)
- Custom rule builder for manual overrides

---

## 5. Feature List (Committed Scope)

The feature list below is the authoritative, contractual scope for this engagement.

### 5.1 🧩 Data Layer (Foundation)

**Features**
- Multi-asset data ingestion
  - Equities (OHLCV, volume, delivery data)
  - Mutual Funds (NAV, AUM, expense ratio)
  - ETFs
  - Indices (sector + benchmark)
  - Commodities (gold, crude)
  - Currency (USD/INR)
- Historical data storage (minimum 5–10 years)
- Corporate actions handling (splits, dividends, bonuses)
- Sector & industry classification mapping
- Benchmark mapping (stock → index, MF → category benchmark)
- Data normalization & cleaning pipeline
- Missing data handling & interpolation
- Daily EOD data update pipeline
- Optional: intraday ingestion (future scope, stubbed)

**Dependencies (APIs / Data Sources)**
- NSE (bhavcopy / unofficial APIs)
- BSE data feeds
- AMFI (NAV data — free)
- Value Research (paid, optional high quality)
- Morningstar (paid, premium dataset)
- Optional paid APIs: Tickertape API (limited access), Quandl
- Macroeconomic data: RBI datasets (free), World Bank / FRED (optional)

### 5.2 📊 Feature Engineering & Analytics Layer

**Features**
- Return calculations: daily, weekly, monthly, rolling returns (critical for MF analysis)
- Risk metrics: standard deviation, Sharpe ratio, Sortino ratio, max drawdown
- Trend indicators: moving averages (20/50/100/200 DMA), RSI, MACD
- Relative strength vs benchmark
- Volatility tracking
- Correlation matrix across assets
- Sector rotation indicators
- Liquidity scoring (volume-based)
- Fund-specific metrics: consistency score, downside protection, expense-adjusted return
- Data feature store (precomputed indicators)

**Dependencies**
- Python: `pandas`, `numpy`, `ta`, `scipy`, `statsmodels`
- Storage: PostgreSQL / TimescaleDB
- Cache: Redis

### 5.3 🤖 AI / Signal Engine

**Features**
- Multi-factor scoring engine (core)
- Asset ranking engine (daily)
- Signal classification: BUY / HOLD / AVOID
- Probability scoring (outperformance likelihood)
- Confidence score generation
- Market regime detection: Bull / Bear / Sideways, Risk-on / Risk-off
- Sector strength ranking
- Fund ranking within category
- Ensemble model (combine multiple models)
- Model retraining pipeline (weekly / monthly)

**Models**
- Gradient Boosting (primary)
- Random Forest
- Logistic Regression (baseline)
- Optional: LSTM (time-series), XGBoost / LightGBM

**Dependencies**
- `scikit-learn`, `xgboost`, `lightgbm`
- Optional: `tensorflow`, `pytorch`
- Model tracking: `MLflow` (optional but recommended)

### 5.4 📈 Recommendation Engine

**Features**
- Daily top picks: Stocks (Top N), Mutual Funds (Top N per category)
- Avoid list: overvalued / high-risk assets
- Allocation suggestions: Equity / Debt / Gold split, sector allocation
- Time-based signals: entry and exit
- Opportunity tagging: Momentum play, Defensive play, Long-term compounder
- Risk flags: high volatility, trend reversal warning

### 5.5 📝 Daily Report Engine (Core Output)

**Features**
- Automated daily report generation
- Report sections: Market overview, Key signals summary, Top opportunities, Avoid / caution list, Sector view, Asset allocation suggestion
- Natural-language explanation (AI-generated summaries)
- Historical report archive
- Export formats: Web view, PDF, Email digest

**Dependencies**
- LLM API (OpenAI or Anthropic) — optional but powerful
- PDF generation: `reportlab` or `weasyprint`

### 5.6 🖥️ Web Portal (User Interface)

**Features**
- Dashboard: market status (Risk ON/OFF), top signals of the day, quick recommendations
- Asset Explorer: search stocks / funds / ETFs; view AI score, risk metrics, trend indicators
- Comparison Tool: stock-vs-stock, fund-vs-fund, asset-vs-benchmark
- Signal View: BUY / AVOID signals, historical signal performance
- Reports section: daily reports archive, filter by date / asset
- Alerts (optional): signal-change alerts, risk alerts

**Tech stack (UI)**
- React 19 / Next.js 16 (App Router)
- Charting: `recharts`, `chart.js`, optional TradingView embeds
- Design language: **Claude-style** minimalism (neutral palette, generous whitespace, IBM Plex / Inter typography)
- Animated primitives: `reactbits.dev`
- Component primitives: `shadcn/ui` (Radix under the hood)
- Tailwind CSS v4

### 5.7 ⚙️ Backend & Infrastructure

**Features**
- REST API layer
- Data ingestion scheduler
- Signal computation scheduler
- Model training pipeline
- Caching layer
- Logging & monitoring
- Role-based access (single user today, future-proofed)

**Dependencies**
- Backend: FastAPI (ML / analytics service) + Next.js Route Handlers (BFF / portal API)
- DB: PostgreSQL (+ TimescaleDB)
- Cache: Redis
- Scheduler: Cron (dev) / Apache Airflow (prod)
- Messaging (optional): Kafka or RabbitMQ
- Hosting: AWS / GCP / Azure

### 5.8 🔐 Security & Data Management

**Features**
- Authentication (JWT, refresh-token rotation)
- Secure API access (HTTPS, CORS whitelist, CSRF for cookie auth)
- Data encryption at rest and in transit
- Backup & recovery (daily snapshots, WAL archiving)
- API key management (envelope encryption for third-party keys)
- Rate limiting (per-IP, per-user, per-endpoint)

### 5.9 📊 Optional Advanced Features (v2+)

- Backtesting engine (critical for validation)
- Strategy simulation
- Portfolio simulation (what-if)
- Sentiment analysis (news, social)
- Global market linkage (US → India correlation)
- Custom rule builder (manual overrides)

**Dependencies**
- NewsAPI, spaCy, Hugging Face `transformers`

### 5.10 💰 API / Cost Summary

**Free (enough for MVP)**
- NSE / BSE (scraped or public data), AMFI (NAV), RBI / macro data

**Paid (recommended for quality)**
- Value Research / Morningstar (MF quality)
- Quandl (macro + alt datasets)
- NewsAPI (sentiment)
- LLM API (OpenAI / Anthropic)

---

## 6. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | Next.js 16 (App Router, Turbopack) | React 19, server components |
| Language | TypeScript 5 | strict mode |
| Styling | Tailwind CSS v4 | design tokens via `@theme` |
| UI primitives | shadcn/ui + Radix | accessible, owned source |
| Animation | reactbits.dev, Framer Motion | subtle, Claude-style |
| Charting | recharts (primary), chart.js, TradingView embeds | |
| State | Zustand | lightweight, no boilerplate |
| Data fetching | TanStack Query | caching, retries |
| Forms | react-hook-form + Zod | schema-first validation |
| Icons | lucide-react | |
| Portal backend | Next.js Route Handlers (Node runtime) | BFF pattern |
| Analytics backend | FastAPI (Python 3.12) | pandas, numpy, scikit-learn, xgboost, lightgbm |
| ORM (portal) | Prisma 7 | PostgreSQL adapter |
| Database | PostgreSQL 16 + TimescaleDB | time-series hypertables |
| Cache | Redis 7 | feature cache + rate limits |
| Scheduler | Cron (dev), Apache Airflow (prod) | DAG per data source |
| Messaging | Kafka or RabbitMQ (optional) | event-driven retraining |
| Auth | JWT (access + refresh), bcrypt/argon2 | |
| Observability | pino + OpenTelemetry + Grafana | |
| PDF | weasyprint (primary), reportlab (fallback) | |
| LLM | Anthropic (primary), OpenAI (fallback) | report narration |
| Testing | Vitest, Playwright, Pytest | |
| CI/CD | GitHub Actions | lint, type-check, tests, build |
| Hosting | AWS (ECS Fargate + RDS + ElastiCache) | or GCP equivalent |

---

## 7. Folder Structure

The repository follows the client-mandated, feature-segregated layout. This is the canonical structure enforced in lint and review.

```
investment/
│
├── src/
│   ├── app/                          # Next.js App Router (Frontend)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── backend/                      # Backend Layer (API Logic)
│   │   ├── api/                      # Route handlers (thin)
│   │   │   ├── auth/route.ts
│   │   │   ├── users/route.ts
│   │   │   ├── assets/route.ts
│   │   │   ├── signals/route.ts
│   │   │   ├── reports/route.ts
│   │   │   ├── alerts/route.ts
│   │   │   └── middleware.ts
│   │   ├── services/                 # Business Logic
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── asset.service.ts
│   │   │   ├── signal.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── alert.service.ts
│   │   │   └── email.service.ts
│   │   ├── repositories/             # Data Access
│   │   │   ├── auth.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   ├── asset.repository.ts
│   │   │   ├── signal.repository.ts
│   │   │   └── report.repository.ts
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   └── migrations/
│   │   │   ├── client.ts
│   │   │   └── seed.ts
│   │   ├── validators/
│   │   │   ├── auth.validator.ts
│   │   │   ├── user.validator.ts
│   │   │   ├── asset.validator.ts
│   │   │   └── signal.validator.ts
│   │   └── utils/
│   │       ├── jwt.util.ts
│   │       ├── hash.util.ts
│   │       └── error-handler.util.ts
│   │
│   ├── frontend/                     # Frontend-Specific Logic
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn + reactbits primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Card.tsx
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   └── RegisterForm.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── StatsCard.tsx
│   │   │   │   │   ├── MarketRegimeBadge.tsx
│   │   │   │   │   └── TopSignalsTable.tsx
│   │   │   │   ├── assets/
│   │   │   │   │   ├── AssetSearch.tsx
│   │   │   │   │   ├── AssetDetailCard.tsx
│   │   │   │   │   └── PriceChart.tsx
│   │   │   │   ├── signals/
│   │   │   │   │   ├── SignalBadge.tsx
│   │   │   │   │   └── SignalHistory.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   ├── ReportViewer.tsx
│   │   │   │   │   └── ReportArchive.tsx
│   │   │   │   └── compare/
│   │   │   │       └── CompareChart.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Footer.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useUser.ts
│   │   │   ├── useAssets.ts
│   │   │   ├── useSignals.ts
│   │   │   └── useReports.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── userStore.ts
│   │   │   └── appStore.ts
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance + interceptors
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.api.ts
│   │   │   │   ├── users.api.ts
│   │   │   │   ├── assets.api.ts
│   │   │   │   ├── signals.api.ts
│   │   │   │   ├── reports.api.ts
│   │   │   │   └── alerts.api.ts
│   │   │   └── types/
│   │   │       ├── auth.types.ts
│   │   │       ├── user.types.ts
│   │   │       ├── asset.types.ts
│   │   │       ├── signal.types.ts
│   │   │       └── report.types.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── constants.ts
│   │
│   ├── shared/
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── asset.types.ts
│   │   │   ├── signal.types.ts
│   │   │   └── common.types.ts
│   │   ├── constants/
│   │   │   ├── routes.ts
│   │   │   └── errors.ts
│   │   └── utils/
│   │       └── common.util.ts
│   │
│   └── config/
│       ├── env.ts                    # zod-validated env
│       ├── api.config.ts
│       └── app.config.ts
│
├── services/                         # Python micro-services (not shown in tree above but co-located in repo)
│   └── analytics/                    # FastAPI app — see §10
│
├── public/
│   ├── images/
│   └── icons/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.local
├── .env.development
├── .env.production
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### 7.1 Folder responsibilities

- `src/app/` — Routable UI only. No business logic here. Server Components fetch via `src/frontend/api` or direct service calls.
- `src/backend/` — All server-side logic. `api/` delegates to `services/`, which delegate to `repositories/`.
- `src/frontend/` — Client UI, hooks, stores, API client.
- `src/shared/` — Types and constants used by both halves. No runtime dependencies on `backend/` or `frontend/`.
- `src/config/` — `env.ts` is the single source of truth for environment variables, validated with Zod.
- `services/analytics/` — Python FastAPI service for heavy analytics / ML.

---

## 8. Frontend Routes

All app-router paths. `(group)` segments do not appear in the URL.

| Path | Access | Description |
|---|---|---|
| `/` | public | Marketing / landing page |
| `/login` | public | Email + password login |
| `/register` | public | Sign up |
| `/forgot-password` | public | Password reset request |
| `/reset-password` | public | Password reset form (token in query) |
| `/dashboard` | auth | Market regime, top signals, quick recommendations |
| `/assets` | auth | Asset explorer (search, filter) |
| `/assets/[symbol]` | auth | Asset detail page (metrics, chart, signal, history) |
| `/compare` | auth | Side-by-side comparison tool |
| `/signals` | auth | Live BUY / AVOID feed + historical performance |
| `/reports` | auth | Daily report archive (list) |
| `/reports/[date]` | auth | Single daily report (web view) |
| `/reports/[date]/pdf` | auth | PDF stream of report |
| `/alerts` | auth | Active alerts + subscription management |
| `/settings` | auth | Profile, password, notification prefs, API keys |
| `/admin` | admin | RBAC-gated admin console |
| `/admin/users` | admin | User list, role assignment |
| `/admin/pipelines` | admin | Ingestion / model DAG health |
| `/admin/models` | admin | Model versions, retrain trigger, MLflow links |

---

## 9. REST API — Portal (Next.js Route Handlers)

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <jwt>` unless marked _public_
**Content-type:** `application/json`
**Errors:** RFC 7807 Problem+JSON shape `{ type, title, status, detail, instance }`

### 9.1 Conventions

- All list endpoints support `?page=<int>&limit=<int>&sort=<field>&order=asc|desc`
- Timestamps are ISO-8601 UTC
- Money in INR minor units (paise) unless noted
- 429 responses include `Retry-After`

### 9.2 Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | public | `{email, password, name}` | `201 {user, tokens}` |
| POST | `/auth/login` | public | `{email, password}` | `200 {user, tokens}` |
| POST | `/auth/refresh` | public | `{refreshToken}` | `200 {tokens}` |
| POST | `/auth/logout` | auth | — | `204` |
| POST | `/auth/forgot-password` | public | `{email}` | `204` |
| POST | `/auth/reset-password` | public | `{token, newPassword}` | `204` |
| GET | `/auth/me` | auth | — | `200 {user}` |

### 9.3 Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users` | admin | List users |
| GET | `/users/:id` | auth (self or admin) | Fetch user |
| PATCH | `/users/:id` | auth (self or admin) | Update profile |
| DELETE | `/users/:id` | admin | Soft-delete user |
| PATCH | `/users/:id/role` | admin | Update RBAC role |

### 9.4 Assets

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/assets` | auth | Paginated list, filterable by `type`, `sector`, `q` |
| GET | `/assets/search?q=...` | auth | Typeahead |
| GET | `/assets/:symbol` | auth | Full detail: metadata, latest metrics, signal |
| GET | `/assets/:symbol/history?from=&to=&interval=` | auth | OHLCV / NAV series |
| GET | `/assets/:symbol/metrics` | auth | Feature-store snapshot |
| GET | `/assets/:symbol/corporate-actions` | auth | Splits, dividends, bonuses |
| POST | `/assets/compare` | auth | `{symbols:[], metric:'return_1y'}` → matrix |

### 9.5 Signals

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/signals/today` | auth | Today's BUY / HOLD / AVOID feed |
| GET | `/signals?date=YYYY-MM-DD&type=BUY` | auth | Historical signals |
| GET | `/signals/:symbol/history` | auth | Per-asset signal log |
| GET | `/signals/regime` | auth | Current market regime (Bull/Bear/Sideways, Risk-on/off) |
| GET | `/signals/sector-strength` | auth | Ranked sector strength |
| GET | `/signals/top-picks?assetType=equity&n=10` | auth | Top N picks |
| GET | `/signals/avoid-list` | auth | Assets flagged AVOID |

### 9.6 Recommendations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/recommendations/allocation` | auth | Equity / Debt / Gold split suggestion |
| GET | `/recommendations/sector-allocation` | auth | Sector-level weights |
| GET | `/recommendations/entries` | auth | Time-based entry signals |
| GET | `/recommendations/exits` | auth | Exit signals |

### 9.7 Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reports` | auth | List (paginated) |
| GET | `/reports/latest` | auth | Latest published report |
| GET | `/reports/:date` | auth | Single report JSON |
| GET | `/reports/:date/pdf` | auth | PDF stream |
| POST | `/reports/:date/email` | auth | Send report to self |
| POST | `/reports/regenerate` | admin | Force regeneration |

### 9.8 Alerts

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/alerts` | auth | My alerts |
| POST | `/alerts` | auth | Create `{symbol, type, threshold, channel}` |
| PATCH | `/alerts/:id` | auth | Update |
| DELETE | `/alerts/:id` | auth | Remove |
| GET | `/alerts/events?since=` | auth | Triggered events |

### 9.9 Admin / Ops

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/health` | admin | Overall health |
| GET | `/admin/pipelines` | admin | DAG status |
| POST | `/admin/pipelines/:name/trigger` | admin | Manual run |
| GET | `/admin/models` | admin | Model registry |
| POST | `/admin/models/retrain` | admin | Trigger retrain |
| GET | `/admin/audit-log` | admin | Audit trail |

### 9.10 Standard response envelope

```json
{
  "data": { /* payload */ },
  "meta": { "page": 1, "limit": 20, "total": 482 },
  "requestId": "req_01HW..."
}
```

---

## 10. REST API — Analytics Service (FastAPI)

**Base URL (internal):** `http://analytics:8000/api/v1`
**Auth:** mTLS or shared internal `X-Internal-Key` header (never exposed to browser).

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness + readiness |
| POST | `/ingest/run` | Trigger ingestion job, body: `{source, date}` |
| POST | `/features/compute` | Recompute feature store for `{symbol?, date_range}` |
| POST | `/signals/generate` | Run daily signal job |
| GET | `/signals/{symbol}?date=` | Single-asset signal |
| POST | `/models/train` | Kick off training, body: `{model, asOf}` |
| GET | `/models` | List registered models |
| POST | `/reports/build` | Build daily report artifacts |
| POST | `/backtest/run` | (v2) Backtest config |

The Next.js backend never calls third-party data APIs directly in production — it always goes through this service, which owns retries, de-duplication and rate-limit accounting.

---

## 11. Data Model (High-Level)

Core tables (Prisma / PostgreSQL):

- `users(id, email, passwordHash, name, role, createdAt, ...)`
- `refresh_tokens(id, userId, tokenHash, expiresAt, revokedAt)`
- `assets(id, symbol, name, type, sector, industry, exchange, benchmarkId, ...)`
- `asset_prices` — **TimescaleDB hypertable** `(assetId, ts, open, high, low, close, volume, delivery)`
- `mf_nav` — hypertable `(assetId, ts, nav, aum)`
- `corporate_actions(id, assetId, type, effectiveDate, ratio, amount, ...)`
- `features_daily(assetId, date, ret_1d, ret_1w, ret_1m, sharpe_1y, sortino_1y, dd_max, rsi_14, macd, ma_20, ma_50, ma_200, vol_30d, rs_vs_bench, ...)`
- `signals_daily(assetId, date, signal, probability, confidence, rationale, modelVersion)`
- `market_regime(date, regime, riskOnOff, notes)`
- `reports(id, date, markdown, htmlUrl, pdfUrl, status, createdAt)`
- `alerts(id, userId, symbol, type, threshold, channel, active)`
- `alert_events(id, alertId, triggeredAt, payload)`
- `audit_log(id, userId, action, entity, entityId, meta, ts)`

---

## 12. Non-Functional Requirements

| Category | Target |
|---|---|
| Availability (portal) | 99.5% business hours, 99.0% overall |
| Page TTI | < 2.5 s on 4G |
| API p95 latency | < 300 ms (read), < 800 ms (write) |
| EOD data freshness | Available by 20:00 IST |
| Report publish time | By 07:30 IST next day |
| Backups | Daily snapshot + 7-day PITR |
| Security | OWASP ASVS L2 |
| Observability | structured JSON logs, request IDs, traces |

---

## 13. Acceptance Criteria

The engagement is complete when:

1. All features in §5 marked in-scope are delivered and pass the acceptance tests in the Roadmap.
2. REST API contracts in §9 pass contract tests and OpenAPI spec is published.
3. Web portal routes in §8 are reachable, responsive, keyboard-accessible (WCAG AA).
4. Daily Report is generated automatically for 5 consecutive business days without manual intervention.
5. E2E tests (Playwright) green in CI; unit + integration coverage ≥ 70%.
6. Load test: 50 concurrent users, p95 < 500 ms on hot paths.
7. Security review clean (Semgrep, `npm audit`, Bandit on Python).
8. Developer Guide and User Manual delivered in `.md` and `.docx`.

---

## 14. Assumptions, Risks, Dependencies

**Assumptions**
- Client provides paid API credentials (Value Research / Morningstar / NewsAPI / LLM) before Sprint 3.
- Single-region deployment (ap-south-1) is acceptable for v1.
- No regulatory advisory certification is required; platform is explicitly research-only.

**Risks**
- Unofficial NSE/BSE endpoints may throttle or break → mitigate with bhavcopy archive fallback.
- AMFI NAV parsing format changes → contract test daily.
- LLM cost overrun → cache prompts + responses; tight prompt budget.
- TimescaleDB operational complexity → start with plain PostgreSQL + proper indexes, enable hypertables when data > 50M rows.

**External Dependencies**
- NSE bhavcopy archive, BSE EOD, AMFI NAVAll.txt, RBI reference rates.

---

## 15. Deliverables

| # | Artifact | Format |
|---|---|---|
| 1 | Statement of Work (this document) | `.md` + `.docx` |
| 2 | Roadmap | `.md` + `.docx` |
| 3 | Developers Guide | `.md` + `.docx` |
| 4 | User Manual | `.md` + `.docx` |
| 5 | Source code (mono-repo) | Git |
| 6 | OpenAPI spec | `openapi.yaml` |
| 7 | Prisma schema + migrations | `src/backend/database/prisma/` |
| 8 | Deployment scripts (Docker, Terraform skeleton) | `infra/` |
| 9 | CI workflow | `.github/workflows/` |
| 10 | Seed data + demo account | migration + seed |

---

## 16. Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Product Owner | | | |
| Tech Lead | | | |
| Client Sponsor | | | |
