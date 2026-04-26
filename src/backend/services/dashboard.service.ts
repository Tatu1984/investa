import { prisma } from "@/backend/database/client";
import { assetService, type AssetDto } from "./asset.service";
import { signalRepository } from "@/backend/repositories/signal.repository";
import type { Regime, Signal } from "@prisma/client";

export interface DashboardKpi {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean };
  hint?: string;
}

export interface DashboardSummary {
  asOf: string;
  regime: {
    regime: Regime;
    risk: "Risk-On" | "Risk-Off";
    confidence: number;
    rationale: string;
  } | null;
  kpis: DashboardKpi[];
  topBuys: AssetDto[];
  topAvoids: AssetDto[];
  sectorStrength: { sector: string; avgReturn: number; count: number; trend: "up" | "down" | "flat" }[];
  indexSeries: { date: string; price: number }[];
  allocation: { equity: number; debt: number; gold: number };
}

async function sectorStrengthFromPrices(): Promise<DashboardSummary["sectorStrength"]> {
  // Use the NSE equities with non-null sector and sufficient price history.
  // For v0 we use 1D return — later phases add 1M / 1Y windows.
  const rows = await prisma.$queryRaw<{ sector: string; avg_return: number; count: number }[]>`
    WITH latest AS (
      SELECT DISTINCT ON ("assetId") "assetId", ts, close
      FROM asset_prices
      ORDER BY "assetId", ts DESC
    ),
    prev AS (
      SELECT DISTINCT ON (p."assetId") p."assetId", p.ts, p.close
      FROM asset_prices p
      JOIN latest l ON l."assetId" = p."assetId" AND p.ts < l.ts
      ORDER BY p."assetId", p.ts DESC
    ),
    r AS (
      SELECT a.sector AS sector,
             ((l.close - pr.close) / pr.close)::float AS ret
      FROM assets a
      JOIN latest l ON l."assetId" = a.id
      JOIN prev   pr ON pr."assetId" = a.id
      WHERE a.type = 'equity' AND a.sector IS NOT NULL AND pr.close > 0
    )
    SELECT sector, AVG(ret) AS avg_return, COUNT(*)::int AS count
    FROM r
    GROUP BY sector
    HAVING COUNT(*) >= 3
    ORDER BY avg_return DESC
    LIMIT 10;
  `;
  return rows.map((r) => ({
    sector: r.sector,
    avgReturn: Number(r.avg_return) * 100,
    count: r.count,
    trend:
      Number(r.avg_return) > 0.003 ? ("up" as const) :
      Number(r.avg_return) < -0.003 ? ("down" as const) : ("flat" as const),
  }));
}

async function niftySeries(): Promise<DashboardSummary["indexSeries"]> {
  const nifty = await prisma.asset.findUnique({ where: { symbol: "NIFTY50" } });
  if (!nifty) return [];
  const rows = await prisma.assetPrice.findMany({
    where: { assetId: nifty.id },
    orderBy: { ts: "asc" },
    take: 120,
  });
  return rows.map((p) => ({ date: p.ts.toISOString().slice(0, 10), price: Number(p.close) }));
}

async function kpis(): Promise<DashboardKpi[]> {
  // Count today's and yesterday's signals per type to compute deltas.
  const latest = await signalRepository.latestDate();
  if (!latest) {
    return [
      { label: "New BUYs", value: 0 },
      { label: "New AVOIDs", value: 0 },
      { label: "Avg BUY prob.", value: "—" },
      { label: "Total assets", value: await prisma.asset.count() },
    ];
  }

  // Take the previous distinct signals date.
  const prevRow = await prisma.signalsDaily.findFirst({
    where: { date: { lt: latest } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  async function counts(date: Date | undefined) {
    if (!date) return { BUY: 0, AVOID: 0, avgProb: 0 };
    const rows = await prisma.signalsDaily.findMany({ where: { date }, select: { signal: true, probability: true } });
    const BUY = rows.filter((r) => r.signal === "BUY");
    const AVOID = rows.filter((r) => r.signal === "AVOID");
    return {
      BUY: BUY.length,
      AVOID: AVOID.length,
      avgProb: BUY.length ? Math.round(BUY.reduce((s, r) => s + r.probability, 0) / BUY.length) : 0,
    };
  }
  const now = await counts(latest);
  const prev = await counts(prevRow?.date);

  const buyDelta = now.BUY - prev.BUY;
  const avoidDelta = now.AVOID - prev.AVOID;

  return [
    { label: "New BUYs",      value: now.BUY,   delta: prevRow ? { value: (buyDelta >= 0 ? "+" : "") + String(buyDelta),      positive: buyDelta >= 0   } : undefined, hint: "vs yesterday" },
    { label: "New AVOIDs",    value: now.AVOID, delta: prevRow ? { value: (avoidDelta >= 0 ? "+" : "") + String(avoidDelta), positive: avoidDelta < 0  } : undefined, hint: "vs yesterday" },
    { label: "Avg BUY prob.", value: `${now.avgProb}%`, hint: "model ensemble" },
    { label: "Total assets",  value: (await prisma.asset.count()).toLocaleString("en-IN"), hint: "in Neon" },
  ];
}

export const dashboardService = {
  async summary(): Promise<DashboardSummary> {
    const [regimeRow, topBuys, topAvoids, sectorStrength, indexSeries, kpisOut] = await Promise.all([
      signalRepository.currentRegime(),
      assetService.topPicks({ type: "BUY", n: 6 }),
      assetService.topPicks({ type: "AVOID", n: 6 }),
      sectorStrengthFromPrices(),
      niftySeries(),
      kpis(),
    ]);

    const regime = regimeRow
      ? {
          regime: regimeRow.regime,
          risk: regimeRow.riskState === "RISK_ON" ? ("Risk-On" as const) : ("Risk-Off" as const),
          confidence: Number(regimeRow.confidence),
          rationale: regimeRow.rationale,
        }
      : null;

    // Static, regime-aware default allocation for the dashboard view.
    const allocation = { equity: 60, debt: 25, gold: 15 };

    return {
      asOf: new Date().toISOString(),
      regime,
      kpis: kpisOut,
      topBuys,
      topAvoids,
      sectorStrength,
      indexSeries,
      allocation,
    };
  },
};

// Re-export for routes that want tighter tree-shaking
export type { Signal };
