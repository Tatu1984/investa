import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import {
  annualisedVolFromDailyReturns,
  dailyReturns,
  maxDrawdownPct,
  returnNBars,
  rsi,
  sma,
} from "./math";

export interface FeaturesRow {
  assetId: string;
  date: Date;           // the date features are computed AS OF (usually today)
  ret1d: number | null;
  ret1w: number | null;
  ret1m: number | null;
  ret1y: number | null;
  ret3y: number | null;
  vol30d: number | null;
  maxDrawdown: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  rsi14: number | null;
  /** Last close — handy for the signal engine. Not persisted to features_daily. */
  lastClose: number;
  /** Number of price points used. */
  dataPoints: number;
}

/** Load ascending close-price series (or NAV for MFs) for a single asset. */
export async function loadSeries(assetId: string, type: string, sinceDaysAgo = 400): Promise<number[]> {
  const since = new Date(Date.now() - sinceDaysAgo * 86400 * 1000);
  if (type === "mf") {
    const rows = await prisma.mfNav.findMany({
      where: { assetId, ts: { gte: since } },
      orderBy: { ts: "asc" },
      select: { nav: true },
    });
    return rows.map((r) => Number(r.nav));
  }
  const rows = await prisma.assetPrice.findMany({
    where: { assetId, ts: { gte: since } },
    orderBy: { ts: "asc" },
    select: { close: true },
  });
  return rows.map((r) => Number(r.close));
}

/** Compute a features row from a price/NAV series ordered ascending. */
export function computeFeaturesFromSeries(assetId: string, date: Date, series: number[]): FeaturesRow | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1]!;
  const rets30 = dailyReturns(series, 30);
  return {
    assetId,
    date,
    ret1d:  returnNBars(series, 1),
    ret1w:  returnNBars(series, 5),
    ret1m:  returnNBars(series, 21),
    ret1y:  returnNBars(series, 252),
    ret3y:  returnNBars(series, 756),
    vol30d: annualisedVolFromDailyReturns(rets30),
    maxDrawdown: maxDrawdownPct(series),
    ma20:  sma(series, 20),
    ma50:  sma(series, 50),
    ma200: sma(series, 200),
    rsi14: rsi(series, 14),
    lastClose: last,
    dataPoints: series.length,
  };
}

/** Compute + upsert a single asset's features for a date. */
export async function computeAndWriteFeatures(assetId: string, type: string, asOf: Date): Promise<FeaturesRow | null> {
  const series = await loadSeries(assetId, type);
  const row = computeFeaturesFromSeries(assetId, asOf, series);
  if (!row || row.dataPoints < 2) return row; // not enough data — skip upsert

  await prisma.featuresDaily.upsert({
    where: { assetId_date: { assetId, date: asOf } },
    update: {
      ret1d: row.ret1d,
      ret1w: row.ret1w,
      ret1m: row.ret1m,
      ret1y: row.ret1y,
      ret3y: row.ret3y,
      vol30d: row.vol30d,
      maxDrawdown: row.maxDrawdown,
      ma20: row.ma20,
      ma50: row.ma50,
      ma200: row.ma200,
      rsi14: row.rsi14,
    },
    create: {
      assetId,
      date: asOf,
      ret1d: row.ret1d,
      ret1w: row.ret1w,
      ret1m: row.ret1m,
      ret1y: row.ret1y,
      ret3y: row.ret3y,
      vol30d: row.vol30d,
      maxDrawdown: row.maxDrawdown,
      ma20: row.ma20,
      ma50: row.ma50,
      ma200: row.ma200,
      rsi14: row.rsi14,
    },
  });
  return row;
}

export interface FeaturesRunResult {
  asOf: string;
  assetsScanned: number;
  featuresWritten: number;
  skippedInsufficient: number;
  durationMs: number;
  errors: string[];
}

/**
 * Scan all assets, compute features, upsert in parallel batches.
 * Returns a result summary but also keeps a memoized feature set in-memory for the signal stage.
 */
export async function runFeaturesForAllAssets(asOf: Date, opts: { batchSize?: number; assetTypes?: string[] } = {}): Promise<{ result: FeaturesRunResult; rows: FeaturesRow[] }> {
  const started = Date.now();
  const errors: string[] = [];

  // Pre-filter: only analyse assets that actually have ≥2 data points.
  // Without this the scanner does 16 660 round-trips to discover most assets
  // only have 1 price (first-day ingestion); costly for no reason.
  const rowsWithPrices = await prisma.$queryRaw<{ assetId: string; n: number }[]>`
    SELECT "assetId", COUNT(*)::int AS n FROM asset_prices GROUP BY "assetId" HAVING COUNT(*) >= 2
  `;
  const rowsWithNavs = await prisma.$queryRaw<{ assetId: string; n: number }[]>`
    SELECT "assetId", COUNT(*)::int AS n FROM mf_nav GROUP BY "assetId" HAVING COUNT(*) >= 2
  `;
  const eligibleIds = new Set<string>([...rowsWithPrices.map((r) => r.assetId), ...rowsWithNavs.map((r) => r.assetId)]);
  const totalInDb = await prisma.asset.count();

  if (eligibleIds.size === 0) {
    const result: FeaturesRunResult = {
      asOf: asOf.toISOString(),
      assetsScanned: totalInDb,
      featuresWritten: 0,
      skippedInsufficient: totalInDb,
      durationMs: Date.now() - started,
      errors: ["No asset has ≥2 data points yet — run ingestion at least twice before analytics."],
    };
    logger.warn(result, "features_run_nothing_to_do");
    return { result, rows: [] };
  }

  const assets = await prisma.asset.findMany({
    where: {
      id: { in: Array.from(eligibleIds) },
      ...(opts.assetTypes?.length ? { type: { in: opts.assetTypes as never[] } } : {}),
    },
    select: { id: true, type: true, symbol: true },
    orderBy: { symbol: "asc" },
  });

  const batchSize = opts.batchSize ?? 40;
  const rows: FeaturesRow[] = [];
  let written = 0;
  let skipped = totalInDb - assets.length; // assets without ≥2 points are counted as skipped up-front

  for (let i = 0; i < assets.length; i += batchSize) {
    const slice = assets.slice(i, i + batchSize);
    const results = await Promise.all(
      slice.map(async (a) => {
        try {
          const series = await loadSeries(a.id, a.type);
          const row = computeFeaturesFromSeries(a.id, asOf, series);
          if (!row) return { skipped: true, row: null };
          if (row.dataPoints < 2) return { skipped: true, row };
          await prisma.featuresDaily.upsert({
            where: { assetId_date: { assetId: a.id, date: asOf } },
            update: { ret1d: row.ret1d, ret1w: row.ret1w, ret1m: row.ret1m, ret1y: row.ret1y, ret3y: row.ret3y, vol30d: row.vol30d, maxDrawdown: row.maxDrawdown, ma20: row.ma20, ma50: row.ma50, ma200: row.ma200, rsi14: row.rsi14 },
            create: { assetId: a.id, date: asOf, ret1d: row.ret1d, ret1w: row.ret1w, ret1m: row.ret1m, ret1y: row.ret1y, ret3y: row.ret3y, vol30d: row.vol30d, maxDrawdown: row.maxDrawdown, ma20: row.ma20, ma50: row.ma50, ma200: row.ma200, rsi14: row.rsi14 },
          });
          return { skipped: false, row };
        } catch (err) {
          errors.push(`${a.symbol}: ${err instanceof Error ? err.message : String(err)}`);
          return { skipped: true, row: null };
        }
      })
    );
    for (const r of results) {
      if (r.skipped) skipped++;
      else written++;
      if (r.row) rows.push(r.row);
    }
  }

  const result: FeaturesRunResult = {
    asOf: asOf.toISOString(),
    assetsScanned: totalInDb,
    featuresWritten: written,
    skippedInsufficient: skipped,
    durationMs: Date.now() - started,
    errors,
  };
  logger.info(result, "features_run_done");
  return { result, rows };
}
