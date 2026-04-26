import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { IngestResult } from "./types";

/**
 * Backfill historical NAVs for AMFI mutual funds via mfapi.in (free wrapper).
 *
 * Why: AMFI's NAVAll.txt only has today's NAV. The rule engine needs ≥2 points.
 * mfapi.in returns full history per scheme (often 10+ years).
 *
 * Default scope: 500 "Direct Growth" share-class MFs — the ones retail buys via
 * Zerodha Coin / Groww. Override with ?limit=N&filter=...
 */

const CHUNK = 6;        // parallel mfapi.in fetches
const CHUNK_GAP_MS = 400;

interface MfApiResponse {
  meta?: { scheme_code?: string; scheme_name?: string; fund_house?: string };
  data?: { date: string; nav: string }[];
}

function parseDdMmYyyy(s: string): Date | null {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}

async function fetchMfHistory(schemeCode: string) {
  const url = `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`;
  const res = await fetch(url, { headers: { "User-Agent": "investa-backfill/1.0" } });
  if (!res.ok) throw new Error(`mfapi ${res.status} for ${schemeCode}`);
  const data = (await res.json()) as MfApiResponse;
  if (!data.data) return [];
  const out: { ts: Date; nav: number }[] = [];
  for (const row of data.data) {
    const ts = parseDdMmYyyy(row.date);
    const nav = Number(row.nav);
    if (!ts || !Number.isFinite(nav) || nav <= 0) continue;
    out.push({ ts, nav });
  }
  return out;
}

export async function backfillMfHistory(opts: { limit?: number; filter?: string } = {}): Promise<IngestResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const notes: string[] = [];

  let assetsUpserted = 0;
  let pricesUpserted = 0;

  const limit = opts.limit ?? 500;
  // Default filter: actively-traded retail share class (covers Zerodha / Groww)
  const filter = opts.filter ?? "Direct";

  // Pull MF assets whose name contains the filter token. SQL LIKE %filter% (case-insensitive).
  const mfs = await prisma.asset.findMany({
    where: {
      type: "mf",
      name: { contains: filter, mode: "insensitive" },
    },
    select: { id: true, symbol: true, name: true },
    orderBy: { symbol: "asc" },
    take: limit,
  });

  notes.push(`scanning ${mfs.length} MFs · filter="${filter}" · limit=${limit}`);
  logger.info({ count: mfs.length, filter, limit }, "mf_backfill_start");

  let succeeded = 0;
  for (let i = 0; i < mfs.length; i += CHUNK) {
    const slice = mfs.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (a) => {
        try {
          // Our symbol is `MF_<schemeCode>` — strip the prefix.
          const code = a.symbol.replace(/^MF_/, "");
          const series = await fetchMfHistory(code);
          if (series.length === 0) return;
          // mfapi.in returns 10+ years of daily; cap to last 365 days for the rule engine.
          const since = Date.now() - 366 * 86400 * 1000;
          const recent = series.filter((p) => p.ts.getTime() >= since);
          if (recent.length < 2) return;
          await Promise.all(
            recent.map((p) =>
              prisma.mfNav.upsert({
                where: { assetId_ts: { assetId: a.id, ts: p.ts } },
                update: { nav: p.nav },
                create: { assetId: a.id, ts: p.ts, nav: p.nav },
              })
            )
          );
          assetsUpserted++;
          pricesUpserted += recent.length;
          succeeded++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (errors.length < 50) errors.push(`${a.symbol}: ${msg}`);
        }
      })
    );
    if (i + CHUNK < mfs.length) await new Promise((r) => setTimeout(r, CHUNK_GAP_MS));
    if ((i / CHUNK) % 25 === 0 && i > 0) {
      logger.info({ done: i + CHUNK, total: mfs.length, succeeded }, "mf_backfill_progress");
    }
  }

  notes.push(`${succeeded} MFs got history, ${mfs.length - succeeded} skipped`);

  const finishedAt = new Date();
  const result: IngestResult = {
    source: "amfi",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    assetsUpserted,
    pricesUpserted,
    errors,
    notes,
  };
  logger.info(result, "mf_backfill_done");
  return result;
}
