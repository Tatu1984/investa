import { prisma } from "@/backend/database/client";
import type { AssetType } from "@prisma/client";
import { logger } from "@/backend/utils/logger.util";
import { IngestError, type IngestResult } from "./types";

/**
 * Yahoo Finance v8 chart endpoint.
 *  Free, no auth, very stable.
 *  We use it for things AMFI/NSE don't cover well in one shot:
 *    - Indices (NIFTY 50, BANK NIFTY, NIFTY IT, NIFTY 500)
 *    - USD/INR
 *    - Commodities (gold, crude proxies)
 */

interface YahooSymbol {
  yahoo: string;       // ^NSEI
  symbol: string;      // NIFTY50
  name: string;
  type: AssetType;
  sector: string | null;
  exchange: string;
  benchmark?: string;
}

const SYMBOLS: YahooSymbol[] = [
  // Indices
  { yahoo: "^NSEI",      symbol: "NIFTY50",   name: "NIFTY 50",        type: "index",     sector: "Broad",       exchange: "NSE" },
  { yahoo: "^NSEBANK",   symbol: "NIFTYBANK", name: "NIFTY Bank",      type: "index",     sector: "Financials",  exchange: "NSE" },
  { yahoo: "^CNXIT",     symbol: "NIFTYIT",   name: "NIFTY IT",        type: "index",     sector: "IT",          exchange: "NSE" },
  { yahoo: "^CRSLDX",    symbol: "NIFTY500",  name: "NIFTY 500",       type: "index",     sector: "Broad",       exchange: "NSE" },
  // FX
  { yahoo: "INR=X",      symbol: "USDINR",    name: "USD / INR",       type: "currency",  sector: "FX",          exchange: "RBI" },
  // Commodities (USD-denominated proxies — front-month futures)
  { yahoo: "GC=F",       symbol: "GOLD",      name: "Gold (USD/oz)",   type: "commodity", sector: "Commodities", exchange: "COMEX" },
  { yahoo: "CL=F",       symbol: "CRUDE",     name: "Crude Oil (WTI)", type: "commodity", sector: "Commodities", exchange: "NYMEX" },
];

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

async function fetchYahoo(yahooSymbol: string, range: string): Promise<{ ts: Date; open: number; high: number; low: number; close: number; volume: number }[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=1d&includePrePost=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; investa-ingest/1.0)" },
  });
  if (!res.ok) throw new IngestError("yahoo", `Yahoo HTTP ${res.status} for ${yahooSymbol}`);
  const data = (await res.json()) as YahooChartResponse;
  if (data.chart.error) throw new IngestError("yahoo", `Yahoo error for ${yahooSymbol}: ${data.chart.error.description}`);
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

export async function ingestYahoo(opts: { range?: string } = {}): Promise<IngestResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const notes: string[] = [];

  let assetsUpserted = 0;
  let pricesUpserted = 0;
  const range = opts.range ?? "1mo"; // default: last month; bump to "5y" for backfill

  for (const sym of SYMBOLS) {
    try {
      const series = await fetchYahoo(sym.yahoo, range);
      if (series.length === 0) {
        notes.push(`${sym.symbol}: no data`);
        continue;
      }
      const asset = await prisma.asset.upsert({
        where: { symbol: sym.symbol },
        update: { name: sym.name, type: sym.type, sector: sym.sector ?? undefined, exchange: sym.exchange, benchmark: sym.benchmark ?? null },
        create: {
          symbol: sym.symbol,
          name: sym.name,
          type: sym.type,
          sector: sym.sector,
          exchange: sym.exchange,
          benchmark: sym.benchmark ?? null,
        },
        select: { id: true },
      });
      assetsUpserted++;

      // Upsert each daily price
      const ops = series.map((p) =>
        prisma.assetPrice.upsert({
          where: { assetId_ts: { assetId: asset.id, ts: p.ts } },
          update: { open: p.open, high: p.high, low: p.low, close: p.close, volume: BigInt(p.volume) },
          create: {
            assetId: asset.id, ts: p.ts,
            open: p.open, high: p.high, low: p.low, close: p.close,
            volume: BigInt(p.volume),
          },
        })
      );
      await Promise.all(ops);
      pricesUpserted += series.length;
      notes.push(`${sym.symbol}: ${series.length} bars`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${sym.symbol}: ${msg}`);
      logger.warn({ symbol: sym.symbol, err: msg }, "yahoo_symbol_failed");
    }
  }

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
  logger.info(result, "yahoo_ingest_done");
  return result;
}
