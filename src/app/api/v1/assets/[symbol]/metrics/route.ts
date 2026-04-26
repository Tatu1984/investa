import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";
import { computeFeaturesFromSeries, loadSeries } from "@/backend/jobs/analytics/features";

export const runtime = "nodejs";

/**
 * Prefer the latest persisted `features_daily` row (written by Phase D v0 analytics run).
 * Fall back to on-the-fly computation for assets that haven't been analysed yet,
 * so the UI never shows empty metrics just because the nightly job hasn't run.
 */
export const GET = withAuth<{ params: Promise<{ symbol: string }> }>(async (_req, ctx, { params }) => {
  const { symbol } = await params;
  const asset = await prisma.asset.findFirst({ where: { symbol: { equals: symbol, mode: "insensitive" } } });
  if (!asset) throw NotFound(`Asset ${symbol} not found`);

  // 1. Try the persisted row
  const row = await prisma.featuresDaily.findFirst({
    where: { assetId: asset.id },
    orderBy: { date: "desc" },
  });

  if (row) {
    return ok({
      data: {
        return1m: row.ret1m != null ? Number(row.ret1m) : null,
        return3m: null,
        return1y: row.ret1y != null ? Number(row.ret1y) : null,
        volatility30d: row.vol30d != null ? Number(row.vol30d) : null,
        maxDrawdown: row.maxDrawdown != null ? Number(row.maxDrawdown) : null,
        sharpe1y: row.sharpe1y != null ? Number(row.sharpe1y) : null,
        ma20: row.ma20 != null ? Number(row.ma20) : null,
        ma50: row.ma50 != null ? Number(row.ma50) : null,
        ma200: row.ma200 != null ? Number(row.ma200) : null,
        rsi14: row.rsi14 != null ? Number(row.rsi14) : null,
        asOf: row.date.toISOString().slice(0, 10),
        source: "features_daily",
      },
    }, ctx);
  }

  // 2. Fall back to on-the-fly — fast, non-persistent
  const series = await loadSeries(asset.id, asset.type);
  if (series.length < 2) {
    return ok({
      data: {
        return1m: null, return3m: null, return1y: null,
        volatility30d: null, maxDrawdown: null, sharpe1y: null,
        ma20: null, ma50: null, ma200: null, rsi14: null,
        note: "Not enough history yet — at least 2 data points required.",
        source: "none",
      },
    }, ctx);
  }

  const f = computeFeaturesFromSeries(asset.id, new Date(), series)!;
  return ok({
    data: {
      return1m: f.ret1m,
      return3m: null,
      return1y: f.ret1y,
      volatility30d: f.vol30d,
      maxDrawdown: f.maxDrawdown,
      sharpe1y: null,
      ma20: f.ma20,
      ma50: f.ma50,
      ma200: f.ma200,
      rsi14: f.rsi14,
      dataPoints: f.dataPoints,
      note: "Computed on-the-fly. Run analytics to persist.",
      source: "onTheFly",
    },
  }, ctx);
});
