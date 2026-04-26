-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('equity', 'mf', 'etf', 'index', 'commodity', 'currency');

-- CreateEnum
CREATE TYPE "CorporateActionType" AS ENUM ('split', 'dividend', 'bonus');

-- CreateEnum
CREATE TYPE "Signal" AS ENUM ('BUY', 'HOLD', 'AVOID');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('Bull', 'Bear', 'Sideways');

-- CreateEnum
CREATE TYPE "RiskState" AS ENUM ('RISK_ON', 'RISK_OFF');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('draft', 'published', 'failed');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('signal_change', 'risk_flag', 'trend_reversal');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('in_app', 'email', 'both');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "sector" TEXT,
    "industry" TEXT,
    "exchange" TEXT,
    "benchmark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_prices" (
    "assetId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(18,4) NOT NULL,
    "high" DECIMAL(18,4) NOT NULL,
    "low" DECIMAL(18,4) NOT NULL,
    "close" DECIMAL(18,4) NOT NULL,
    "volume" BIGINT NOT NULL,
    "delivery" BIGINT,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("assetId","ts")
);

-- CreateTable
CREATE TABLE "mf_nav" (
    "assetId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "nav" DECIMAL(18,4) NOT NULL,
    "aum" DECIMAL(20,2),

    CONSTRAINT "mf_nav_pkey" PRIMARY KEY ("assetId","ts")
);

-- CreateTable
CREATE TABLE "corporate_actions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "CorporateActionType" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "ratio" TEXT,
    "amount" DECIMAL(18,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features_daily" (
    "assetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ret1d" DECIMAL(10,6),
    "ret1w" DECIMAL(10,6),
    "ret1m" DECIMAL(10,6),
    "ret1y" DECIMAL(10,6),
    "ret3y" DECIMAL(10,6),
    "sharpe1y" DECIMAL(10,4),
    "sortino1y" DECIMAL(10,4),
    "maxDrawdown" DECIMAL(10,4),
    "vol30d" DECIMAL(10,4),
    "rsi14" DECIMAL(10,4),
    "macd" DECIMAL(10,4),
    "ma20" DECIMAL(18,4),
    "ma50" DECIMAL(18,4),
    "ma200" DECIMAL(18,4),
    "rsVsBench" DECIMAL(10,4),

    CONSTRAINT "features_daily_pkey" PRIMARY KEY ("assetId","date")
);

-- CreateTable
CREATE TABLE "signals_daily" (
    "assetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "signal" "Signal" NOT NULL,
    "probability" INTEGER NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL,
    "rationale" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_daily_pkey" PRIMARY KEY ("assetId","date")
);

-- CreateTable
CREATE TABLE "market_regime" (
    "date" DATE NOT NULL,
    "regime" "Regime" NOT NULL,
    "riskState" "RiskState" NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_regime_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "threshold" TEXT,
    "channel" "AlertChannel" NOT NULL DEFAULT 'in_app',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_key" ON "assets"("symbol");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- CreateIndex
CREATE INDEX "assets_sector_idx" ON "assets"("sector");

-- CreateIndex
CREATE INDEX "corporate_actions_assetId_effectiveDate_idx" ON "corporate_actions"("assetId", "effectiveDate");

-- CreateIndex
CREATE INDEX "signals_daily_date_signal_idx" ON "signals_daily"("date", "signal");

-- CreateIndex
CREATE UNIQUE INDEX "reports_date_key" ON "reports"("date");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX "alert_events_alertId_triggeredAt_idx" ON "alert_events"("alertId", "triggeredAt");

-- CreateIndex
CREATE INDEX "audit_log_ts_idx" ON "audit_log"("ts");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mf_nav" ADD CONSTRAINT "mf_nav_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features_daily" ADD CONSTRAINT "features_daily_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals_daily" ADD CONSTRAINT "signals_daily_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
