import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import { IngestError, type IngestResult } from "./types";

/**
 * NSE EOD bhavcopy — modern "sec_bhavdata_full_DDMMYYYY.csv" format.
 * Columns: SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN_PRICE, HIGH_PRICE, LOW_PRICE,
 *          LAST_PRICE, CLOSE_PRICE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS,
 *          NO_OF_TRADES, DELIV_QTY, DELIV_PER
 */

interface NseRow {
  symbol: string;
  series: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: bigint;
  delivery: bigint | null;
}

function urlForDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `https://archives.nseindia.com/products/content/sec_bhavdata_full_${dd}${mm}${yyyy}.csv`;
}

function parseNseDate(s: string): Date | null {
  // 22-Apr-2026
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const months: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const mo = months[m[2]!];
  if (mo === undefined) return null;
  return new Date(Date.UTC(Number(m[3]), mo, Number(m[1])));
}

function parseNseCsv(text: string): NseRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const out: NseRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    if (cols.length < 15) continue;
    const [symbol, series, date1, , open, high, low, , close, , volume, , , deliv] = cols;
    if (!symbol || !series) continue;
    if (series !== "EQ" && series !== "BE" && series !== "BZ") continue; // keep equity series only
    const d = parseNseDate(date1!);
    if (!d) continue;
    const closeN = Number(close);
    if (Number.isNaN(closeN) || closeN <= 0) continue;
    out.push({
      symbol,
      series,
      date: d,
      open: Number(open) || closeN,
      high: Number(high) || closeN,
      low: Number(low) || closeN,
      close: closeN,
      volume: BigInt(Math.max(0, Math.round(Number(volume) || 0))),
      delivery: deliv && deliv !== "-" ? BigInt(Math.max(0, Math.round(Number(deliv) || 0))) : null,
    });
  }
  return out;
}

async function fetchLatestBhavcopy(): Promise<{ url: string; text: string; date: Date }> {
  // Walk back up to 7 days to find a file (handles weekends/holidays).
  const today = new Date();
  for (let back = 0; back < 8; back++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back));
    const url = urlForDate(d);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; investa-ingest/1.0)" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length < 10_000) continue;
      return { url, text, date: d };
    } catch {
      continue;
    }
  }
  throw new IngestError("nse", "No NSE bhavcopy available in the last 7 days");
}

export async function ingestNse(opts: { limit?: number } = {}): Promise<IngestResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const notes: string[] = [];

  let assetsUpserted = 0;
  let pricesUpserted = 0;

  try {
    logger.info("nse_fetch_start");
    const { url, text, date } = await fetchLatestBhavcopy();
    notes.push(`source: ${url}`);

    const all = parseNseCsv(text);
    notes.push(`parsed ${all.length} EQ/BE/BZ rows for ${date.toISOString().slice(0, 10)}`);
    const rows = opts.limit ? all.slice(0, opts.limit) : all;

    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const assetResults = await Promise.all(
        slice.map((r) =>
          prisma.asset.upsert({
            where: { symbol: r.symbol },
            update: { exchange: "NSE" },
            create: { symbol: r.symbol, name: r.symbol, type: "equity", exchange: "NSE" },
            select: { id: true, symbol: true },
          })
        )
      );
      assetsUpserted += assetResults.length;

      await Promise.all(
        slice.map((r, idx) => {
          const a = assetResults[idx]!;
          return prisma.assetPrice.upsert({
            where: { assetId_ts: { assetId: a.id, ts: r.date } },
            update: { open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume, delivery: r.delivery },
            create: {
              assetId: a.id,
              ts: r.date,
              open: r.open, high: r.high, low: r.low, close: r.close,
              volume: r.volume, delivery: r.delivery,
            },
          });
        })
      );
      pricesUpserted += slice.length;
    }
  } catch (err) {
    logger.error({ err }, "nse_ingest_failed");
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const finishedAt = new Date();
  const result: IngestResult = {
    source: "nse",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    assetsUpserted,
    pricesUpserted,
    errors,
    notes,
  };
  logger.info(result, "nse_ingest_done");
  return result;
}
