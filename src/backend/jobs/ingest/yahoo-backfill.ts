import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { IngestResult } from "./types";

/**
 * Backfills historical close prices for NSE equities using Yahoo Finance.
 * Fetches `<SYMBOL>.NS` and upserts daily bars into asset_prices.
 *
 * Why: NSE bhavcopy is a single day per request, so a fresh DB has only today's
 * close per symbol. The rule engine needs ≥2 data points to compute returns
 * and ≥200 to compute the long-trend MA. Backfill bootstraps the analytics universe.
 *
 * Throughput: ~3-5 symbols/sec into Neon (network-bound); 2,700 symbols ≈ 8-15 min.
 * Yahoo doesn't aggressively rate-limit chart endpoints but we do tiny waits between
 * batches to be polite.
 */

const CHUNK = 8;       // parallel Yahoo fetches per batch
const CHUNK_GAP_MS = 250;
const RANGE = "1y";

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta: { symbol: string };
      timestamp: number[];
      indicators: { quote: Array<{ open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }> };
    }>;
    error?: { description: string } | null;
  };
}

async function fetchYahoo(yahooSymbol: string, range = RANGE) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=1d&includePrePost=false`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; investa-backfill/1.0)" } });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${yahooSymbol}`);
  const data = (await res.json()) as YahooChartResponse;
  if (data.chart.error) throw new Error(`${yahooSymbol}: ${data.chart.error.description}`);
  const r = data.chart.result?.[0];
  if (!r) return [];
  const out: { ts: Date; open: number; high: number; low: number; close: number; volume: number }[] = [];
  const quote = r.indicators.quote[0]!;
  for (let i = 0; i < r.timestamp.length; i++) {
    const close = quote.close[i];
    if (close == null || Number.isNaN(close) || close <= 0) continue;
    const ts = r.timestamp[i];
    if (ts == null) continue;
    out.push({
      ts: new Date(ts * 1000),
      open: quote.open[i] ?? close,
      high: quote.high[i] ?? close,
      low: quote.low[i] ?? close,
      close,
      volume: Math.max(0, Math.round(quote.volume[i] ?? 0)),
    });
  }
  return out;
}

export async function backfillNseFromYahoo(opts: { range?: string; limit?: number } = {}): Promise<IngestResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const notes: string[] = [];

  let assetsUpserted = 0;
  let pricesUpserted = 0;
  const range = opts.range ?? RANGE;

  const equities = await prisma.asset.findMany({
    where: { type: "equity", exchange: "NSE" },
    select: { id: true, symbol: true },
    orderBy: { symbol: "asc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  notes.push(`scanning ${equities.length} NSE equities · range=${range}`);
  logger.info({ count: equities.length, range }, "yahoo_backfill_start");

  let succeeded = 0;
  for (let i = 0; i < equities.length; i += CHUNK) {
    const slice = equities.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (a) => {
        try {
          const series = await fetchYahoo(`${a.symbol}.NS`, range);
          if (series.length === 0) return;
          await Promise.all(
            series.map((p) =>
              prisma.assetPrice.upsert({
                where: { assetId_ts: { assetId: a.id, ts: p.ts } },
                update: { open: p.open, high: p.high, low: p.low, close: p.close, volume: BigInt(p.volume) },
                create: { assetId: a.id, ts: p.ts, open: p.open, high: p.high, low: p.low, close: p.close, volume: BigInt(p.volume) },
              })
            )
          );
          assetsUpserted++;
          pricesUpserted += series.length;
          succeeded++;
        } catch (e) {
          // Many small-cap symbols won't have Yahoo data — that's expected; only log, don't fail the whole job.
          const msg = e instanceof Error ? e.message : String(e);
          if (errors.length < 50) errors.push(`${a.symbol}: ${msg}`);
        }
      })
    );
    // Polite spacing between batches
    if (i + CHUNK < equities.length) await new Promise((r) => setTimeout(r, CHUNK_GAP_MS));
    if ((i / CHUNK) % 25 === 0 && i > 0) {
      logger.info({ done: i + CHUNK, total: equities.length, succeeded }, "yahoo_backfill_progress");
    }
  }

  notes.push(`${succeeded} symbols had history, ${equities.length - succeeded} skipped (likely no Yahoo coverage)`);

  const finishedAt = new Date();
  const result: IngestResult = {
    source: "yahoo",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    assetsUpserted,
    pricesUpserted,
    errors,
    notes,
  };
  logger.info(result, "yahoo_backfill_done");
  return result;
}
