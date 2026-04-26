import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { IngestResult } from "./types";

/**
 * Backfills historical close prices for NSE equities using Yahoo Finance.
 * Fetches `<SYMBOL>.NS` and bulk-inserts daily bars into asset_prices.
 *
 * Why: NSE bhavcopy is a single day per request, so a fresh DB has only today's
 * close per symbol. The rule engine needs ≥2 data points to compute returns
 * and ≥200 to compute the long-trend MA. Backfill bootstraps the analytics universe.
 *
 * Resumable contract:
 *   The job accepts `cursor` (last completed symbol — exclusive) and a wall-clock
 *   budget. It processes as many symbols as fit in the budget, then returns
 *   `{ done, nextCursor, ... }`. The BootstrapPanel calls the route in a loop
 *   until `done: true`, working around Vercel's per-function timeout (60s on
 *   Hobby, 300s on Pro). Each call is idempotent — re-running with the same
 *   cursor is safe because we use INSERT ... ON CONFLICT DO NOTHING under the hood
 *   (`createMany` with `skipDuplicates`).
 *
 * Performance:
 *   Per-symbol cost dropped ~10× by replacing 250 individual upserts with one
 *   `createMany` per symbol. End-to-end, ~2,700 symbols complete in 4–6 calls
 *   of ~50s each on a Vercel Hobby function.
 */

const CHUNK = 12;            // parallel Yahoo fetches per batch
const CHUNK_GAP_MS = 200;
const RANGE = "1y";
const DEFAULT_BUDGET_MS = 50_000; // leave headroom under 60s function cap

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

export interface BackfillResult extends IngestResult {
  done: boolean;
  nextCursor: string | null;
  processed: number;
  total: number;
}

export async function backfillNseFromYahoo(opts: {
  range?: string;
  limit?: number;
  cursor?: string;
  budgetMs?: number;
} = {}): Promise<BackfillResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const notes: string[] = [];

  let assetsUpserted = 0;
  let pricesUpserted = 0;
  let succeeded = 0;
  let processed = 0;
  let lastSymbol: string | null = null;
  const range = opts.range ?? RANGE;
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const deadline = startedAt.getTime() + budgetMs;

  // Total count for progress reporting (cheap aggregate).
  const total = await prisma.asset.count({ where: { type: "equity", exchange: "NSE" } });

  // Pull only the slice past the cursor, ordered by symbol, capped by `limit`.
  const equities = await prisma.asset.findMany({
    where: {
      type: "equity",
      exchange: "NSE",
      ...(opts.cursor ? { symbol: { gt: opts.cursor } } : {}),
    },
    select: { id: true, symbol: true },
    orderBy: { symbol: "asc" },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  notes.push(`scanning ${equities.length} symbols past cursor=${opts.cursor ?? "<start>"} · range=${range}`);
  logger.info({ remaining: equities.length, total, cursor: opts.cursor, range }, "yahoo_backfill_start");

  outer: for (let i = 0; i < equities.length; i += CHUNK) {
    if (Date.now() >= deadline) {
      // Out of time — let the caller resume from the last completed symbol.
      break outer;
    }
    const slice = equities.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (a) => {
        try {
          const series = await fetchYahoo(`${a.symbol}.NS`, range);
          if (series.length === 0) return;
          // Single bulk insert — skipDuplicates makes this idempotent and ~10x
          // faster than per-row upserts.
          const result = await prisma.assetPrice.createMany({
            data: series.map((p) => ({
              assetId: a.id,
              ts: p.ts,
              open: p.open, high: p.high, low: p.low, close: p.close,
              volume: BigInt(p.volume),
            })),
            skipDuplicates: true,
          });
          assetsUpserted++;
          pricesUpserted += result.count;
          succeeded++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (errors.length < 50) errors.push(`${a.symbol}: ${msg}`);
        }
      })
    );
    // Track progress for cursor — last symbol of this slice (slice is sorted).
    lastSymbol = slice[slice.length - 1]!.symbol;
    processed += slice.length;
    if (i + CHUNK < equities.length) await new Promise((r) => setTimeout(r, CHUNK_GAP_MS));
    if ((i / CHUNK) % 10 === 0 && i > 0) {
      logger.info({ done: processed, remaining: equities.length, succeeded }, "yahoo_backfill_progress");
    }
  }

  // Done means we exhausted this call's batch AND there are no more rows past
  // the cursor — i.e. processed everything we asked for.
  const exhaustedSlice = processed >= equities.length;
  // Did we finish the whole universe? Only true when both: we ran to the end of
  // our slice AND that slice was the tail (no more rows above lastSymbol exist).
  const isFinal = exhaustedSlice && (lastSymbol == null
    ? true // empty slice means cursor is past the end → done
    : !(await prisma.asset.findFirst({
        where: { type: "equity", exchange: "NSE", symbol: { gt: lastSymbol } },
        select: { symbol: true },
      })));
  const nextCursor = isFinal ? null : (lastSymbol ?? opts.cursor ?? null);

  notes.push(`${succeeded}/${processed} symbols had history this call; ${errors.length} errors`);

  const finishedAt = new Date();
  const result: BackfillResult = {
    source: "yahoo",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    assetsUpserted,
    pricesUpserted,
    errors,
    notes,
    done: isFinal,
    nextCursor,
    processed,
    total,
  };
  logger.info(result, "yahoo_backfill_done");
  return result;
}
