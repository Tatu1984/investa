# Developers Guide

## Project: AI-Driven Investment Intelligence Platform (`investment`)
**Version:** 1.0 · **Date:** 2026-04-22

This guide is for engineers joining the project. It describes the runtime, the folder conventions, local setup, coding standards, testing, and how to ship a change from a fresh clone to production.

---

## 1. Runtime at a Glance

| Component | Runtime | Port (dev) |
|---|---|---|
| Portal (Next.js 16) | Node 20 | 3000 |
| Analytics (FastAPI) | Python 3.12 | 8000 |
| PostgreSQL 16 + TimescaleDB | Docker | 5432 |
| Redis 7 | Docker | 6379 |
| MLflow | Docker | 5001 |
| MailHog (email dev) | Docker | 8025 |

The portal is the user-facing BFF — it owns auth, the UI and the public REST API. The analytics service owns data ingestion, feature engineering, ML training and signal generation. The portal calls analytics over an internal HTTP contract; the browser never talks to analytics directly.

> **Next.js 16 reminder:** This is not the Next.js you remember. Read `node_modules/next/dist/docs/` before using Route Handlers, caching, or Server Actions. Heed deprecation notices from the build.

---

## 2. Prerequisites

- Node 20.x, pnpm 9.x (`corepack enable`)
- Python 3.12, `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Docker Desktop
- `gh` CLI (optional, for PRs)
- `just` (task runner, optional but recommended)

---

## 3. First-time Setup

```bash
git clone git@github.com:Tatu1984/investment.git
cd investment

# 1. Env
cp .env.example .env.local

# 2. Infra
docker compose up -d postgres redis mlflow mailhog

# 3. Portal
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev                    # http://localhost:3000

# 4. Analytics
cd services/analytics
uv sync
uv run alembic upgrade head
uv run uvicorn analytics.main:app --reload --port 8000
```

After this, the landing page is at http://localhost:3000 and the analytics OpenAPI at http://localhost:8000/docs. A demo user `demo@investment.local / Demo@123` is seeded.

---

## 4. Folder Structure

The repository follows the SoW §7 layout, reproduced briefly here. **Do not rename folders.** Lint and review enforce this.

```
src/
  app/                       # Next.js App Router (UI only, no business logic)
  backend/
    api/                     # thin route handlers → delegate to services
    services/                # business logic
    repositories/            # data access (Prisma)
    database/prisma/         # schema + migrations
    validators/              # Zod schemas
    utils/                   # jwt, hash, error handler
  frontend/
    components/{ui,features,layout}
    hooks/
    store/                   # Zustand
    api/{client.ts,endpoints,types}
    utils/
  shared/
    types/
    constants/
    utils/
  config/                    # env.ts (Zod), api.config.ts, app.config.ts
services/
  analytics/                 # FastAPI micro-service
tests/
  unit/ integration/ e2e/
```

### 4.1 Layer discipline

- `app/*` → Server Components only for data read; call services directly (no self-fetch of own API).
- `backend/api/*` → validates input via `validators/`, dispatches to `services/`, never queries DB itself.
- `backend/services/*` → pure business logic, composes repositories, no HTTP concerns.
- `backend/repositories/*` → only place Prisma is imported.
- `frontend/*` → no import from `backend/` (would leak server code to the client).
- `shared/*` → no runtime dependencies on `backend/` or `frontend/`; types + pure utils only.

---

## 5. Coding Standards

### 5.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`.
- Named exports only. No default exports except for Next.js pages/layouts.
- Infer types from Zod schemas: `export type RegisterInput = z.infer<typeof RegisterSchema>;`
- No `any`. Use `unknown` + narrow.
- Prefer async/await; don't mix with `.then()`.

### 5.2 Python

- Ruff + Black formatting; `pyproject.toml` is the single source of truth.
- Pydantic v2 models for DTOs.
- Type hints required; `mypy --strict` in CI.
- Functions < 50 lines; modules < 400. Split otherwise.

### 5.3 Commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- No AI attribution in commit messages.
- One logical change per commit.

### 5.4 Naming

- Files: `kebab-case.ts` for backend, `PascalCase.tsx` for React components.
- Variables: `camelCase`; booleans read as predicates (`isLoading`, `hasPermission`).
- SQL tables: `snake_case` plural.

---

## 6. Environment Variables

All env vars go through `src/config/env.ts`:

```ts
// src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ANALYTICS_INTERNAL_URL: z.string().url(),
  ANALYTICS_INTERNAL_KEY: z.string().min(16),
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_DAILY_BUDGET_USD: z.coerce.number().default(5),
});

export const env = EnvSchema.parse(process.env);
```

Never read `process.env` directly anywhere else. Adding a new var = add to schema + `.env.example` + this document.

---

## 7. Database

- PostgreSQL 16 + TimescaleDB.
- Migrations live in `src/backend/database/prisma/migrations/`.
- Hypertables (`asset_prices`, `mf_nav`) are declared in a post-migration SQL file (`*_hypertable.sql`) because Prisma can't model them yet.
- Never drop columns without a two-step migration (add new → backfill → stop reading old → drop).
- Seed data in `src/backend/database/seed.ts`. Idempotent.

### 7.1 Common commands

```bash
pnpm prisma migrate dev --name add_signals_table
pnpm prisma generate
pnpm prisma studio
pnpm prisma migrate deploy       # production
```

---

## 8. API Conventions (Portal)

Every route handler follows this shape:

```ts
// src/backend/api/signals/route.ts
import { NextRequest } from 'next/server';
import { SignalsQuerySchema } from '@/backend/validators/signal.validator';
import { getSignals } from '@/backend/services/signal.service';
import { withAuth } from '@/backend/api/middleware';
import { json, problem } from '@/backend/utils/error-handler.util';

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const parsed = SignalsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return problem(400, 'Invalid query', parsed.error);
  const result = await getSignals(user, parsed.data);
  return json(result);
});
```

Rules:
- Parse input with Zod at the boundary.
- Return RFC 7807 `problem+json` for errors.
- Every response includes `requestId` (set by middleware).
- No DB calls in the handler — go through a service.

---

## 9. Frontend Conventions

### 9.1 Data fetching

- Server Components: import the service directly.
- Client Components: `useQuery`/`useMutation` (TanStack Query) via typed hooks in `frontend/hooks/`.

```ts
// src/frontend/hooks/useSignals.ts
import { useQuery } from '@tanstack/react-query';
import { getSignalsToday } from '@/frontend/api/endpoints/signals.api';

export const useTodaySignals = () =>
  useQuery({ queryKey: ['signals','today'], queryFn: getSignalsToday, staleTime: 60_000 });
```

### 9.2 Design system

- **Claude-style**: neutral palette, off-white backgrounds, deep slate ink, single amber accent. Typography: Inter (UI), IBM Plex Mono (data).
- **shadcn/ui**: install with `pnpm dlx shadcn@latest add button card dialog ...`. The generated source lives in `src/frontend/components/ui/`.
- **reactbits.dev**: copy the component source into `src/frontend/components/ui/motion/`. Keep animations subtle; prefer 150–300 ms, cubic-bezier easing.
- **Tailwind v4**: tokens in `globals.css` under `@theme`.

```css
/* src/app/globals.css */
@theme {
  --color-bg: oklch(0.99 0 0);
  --color-ink: oklch(0.22 0.02 250);
  --color-accent: oklch(0.78 0.15 60);
  --radius-card: 14px;
  --font-sans: 'Inter', ui-sans-serif, system-ui;
  --font-mono: 'IBM Plex Mono', ui-monospace;
}
```

### 9.3 Charting

- `recharts` for in-app; wrap in a `<ChartFrame>` component to standardize tooltip, axes, spacing.
- TradingView embed only for deep-dive asset pages (lazy-loaded).

### 9.4 State

- Server state → TanStack Query.
- Client/UI state → Zustand slices (`authStore`, `appStore`).
- Never put server data in Zustand.

---

## 10. Authentication Flow

1. `POST /api/v1/auth/login` → `{ accessToken (15 min), refreshToken (30 d) }`.
2. Access token is returned in the body and set as an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
3. Refresh token is stored server-side (hashed) in `refresh_tokens`; client holds the opaque token in an `httpOnly` cookie.
4. Axios interceptor intercepts 401 → calls `POST /auth/refresh` → retries original request once.
5. Logout revokes the refresh token.

Password hashing uses Argon2id (`argon2` package). JWT signing uses `jose`. Rotate both secrets per deploy.

---

## 11. Analytics Service (Python)

```
services/analytics/
  pyproject.toml
  analytics/
    main.py              # FastAPI app
    api/                 # routers
    pipelines/           # Airflow-style DAG declarations
    ingest/              # per-source scrapers
    features/            # feature engineering
    models/              # training + inference
    reports/             # report builder
    db/                  # SQLAlchemy models + Alembic
    core/                # settings, logging, deps
  tests/
```

- Dependency injection via FastAPI `Depends`.
- Long jobs go to `rq` queue (Redis-backed); API returns `job_id` and a `/jobs/:id` polling endpoint.
- MLflow for model tracking. Model artefacts stored in S3 (`s3://investment-models/...`).

---

## 12. Testing

| Layer | Tool | Location | Target |
|---|---|---|---|
| Unit (TS) | Vitest | co-located `*.test.ts` | services, utils, hooks |
| Unit (Py) | Pytest | `services/analytics/tests/unit` | pipelines, features, models |
| Integration (TS) | Vitest + test DB | `tests/integration` | route handlers against real Postgres |
| Integration (Py) | Pytest + testcontainers | `services/analytics/tests/integration` | DAG tasks, ingestion |
| E2E | Playwright | `tests/e2e` | golden paths |
| Contract | schemathesis | CI job | OpenAPI ↔ implementation |

Run locally:

```bash
pnpm test                 # vitest watch
pnpm test:e2e             # playwright
cd services/analytics && uv run pytest
```

Coverage gate: ≥ 70% lines on `backend/services` and `backend/repositories`.

---

## 13. Observability

- Structured JSON logs via `pino` (portal) and `structlog` (analytics).
- Request ID middleware injects `x-request-id` into every log line.
- OpenTelemetry traces exported to the collector; spans on service + repository methods.
- Metrics: Prometheus endpoint `/metrics` on both services; Grafana dashboards in `infra/grafana/`.
- Errors: Sentry (optional, guarded by env).

Standard log fields: `level`, `msg`, `requestId`, `userId?`, `route`, `durationMs`, `status`.

---

## 14. Security Checklist

- [ ] Input validated (Zod / Pydantic) at every boundary.
- [ ] `helmet`-equivalent headers set in `next.config.ts` + analytics middleware.
- [ ] CORS allowlist explicit; no `*` in production.
- [ ] Rate limit per-IP (default 60 req/min) and per-user (default 300 req/min).
- [ ] Secrets from AWS Secrets Manager; no secrets in `.env` in production.
- [ ] Dependencies: `npm audit --omit=dev`, `pip-audit` in CI.
- [ ] SAST: Semgrep, Bandit.
- [ ] Auth cookies `httpOnly`, `Secure`, `SameSite=Lax`.
- [ ] CSRF token on state-changing cookie-auth endpoints.
- [ ] SQL injection: Prisma + parameterized SQL; no string-interpolated queries.
- [ ] XSS: React escapes by default; no `dangerouslySetInnerHTML` without sanitization.
- [ ] Disclaimer banner on every report: "Research only, not investment advice."

---

## 15. CI/CD

GitHub Actions workflows:

- `ci.yml` on PR: install, lint, type-check, unit, integration, build, Semgrep.
- `e2e.yml` nightly: Playwright against staging.
- `deploy-staging.yml` on `main` merge: build Docker image, push to ECR, `terraform apply` staging.
- `deploy-prod.yml` manual approval: promote the same image to prod.

Branch strategy: trunk-based. Feature flags gate unfinished work. PRs require 1 reviewer + green CI.

---

## 16. How to Add a Feature (Worked Example)

Goal: add an endpoint `GET /api/v1/signals/top-picks?n=10`.

1. **Validator** — `src/backend/validators/signal.validator.ts`:
   ```ts
   export const TopPicksQuerySchema = z.object({ n: z.coerce.number().int().min(1).max(50).default(10) });
   ```
2. **Repository** — `src/backend/repositories/signal.repository.ts`: `findTopPicks(n)` using Prisma.
3. **Service** — `src/backend/services/signal.service.ts`: `getTopPicks(user, n)` — enforces RBAC, caches via Redis for 5 min.
4. **Route** — `src/backend/api/signals/top-picks/route.ts`: parse → service → `json(result)`.
5. **Frontend client** — `src/frontend/api/endpoints/signals.api.ts`: `getTopPicks(n)`.
6. **Hook** — `src/frontend/hooks/useSignals.ts`: `useTopPicks(n)`.
7. **Component** — `src/frontend/components/features/dashboard/TopPicksCard.tsx`.
8. **Tests** — unit for service, integration for route, Playwright smoke on dashboard.
9. **Docs** — update OpenAPI, add to SoW §9 if contractual.

---

## 17. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `prisma` error `URL must start with…` | Prisma 7 needs `prisma.config.ts`, not `url` in schema | move datasource URL to `prisma.config.ts` |
| `401` on every request after login | Cookie domain mismatch | check `NEXT_PUBLIC_APP_URL` vs cookie `domain` |
| Hot reload loop | Server Component importing client-only code | move `'use client'` or split |
| Ingestion job stuck | Redis queue full | `rq info`, flush or scale workers |
| LLM cost spike | prompt cache miss | verify `cache_control` blocks on Anthropic calls |
| Timescale query slow | missing hypertable / chunk exclusion | `EXPLAIN` and add `time` predicate |

---

## 18. Glossary

- **BFF** — Backend for Frontend; the Next.js portal API layer.
- **EOD** — End of Day.
- **OHLCV** — Open/High/Low/Close/Volume.
- **DMA** — Daily Moving Average.
- **RSI / MACD** — Momentum trend indicators.
- **Signal** — Classified recommendation: BUY / HOLD / AVOID.
- **Regime** — Aggregate market state (Bull/Bear/Sideways, Risk-on/off).
- **Feature Store** — Precomputed, versioned table of ML features.

---

## 19. Contact

- Tech Lead: _tbd_
- Data Eng: _tbd_
- On-call rotation: _tbd_
