import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import { classifyMf } from "@/backend/services/classifier.service";
import { IngestError, type IngestResult } from "./types";

const AMFI_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

interface AmfiRow {
  schemeCode: string;
  isinPayout: string | null;
  isinReinvest: string | null;
  schemeName: string;
  nav: number;
  date: Date;       // EOD date
  category: string; // current Open Ended bucket
  amc: string;      // current AMC bucket
}

/**
 * Parse AMFI's NAVAll.txt. Format:
 *   Header line (first row, ignored)
 *   Section title lines, e.g. "Open Ended Schemes(Debt Scheme - Banking and PSU Fund)"
 *   AMC name lines, e.g. "Aditya Birla Sun Life Mutual Fund"
 *   Data rows (semicolon-delimited):
 *     schemeCode ; isinPayout ; isinReinvest ; schemeName ; nav ; date
 *   Blank-ish separator lines (single space)
 */
function parseAmfi(text: string): AmfiRow[] {
  const rows: AmfiRow[] = [];
  let category = "Unknown";
  let amc = "Unknown";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("Scheme Code")) continue;

    if (line.includes(";")) {
      const parts = line.split(";");
      if (parts.length < 6) continue;
      const [schemeCode, isinPayout, isinReinvest, schemeName, navStr, dateStr] = parts;
      const nav = Number(navStr);
      if (!schemeCode || !schemeName || !navStr || Number.isNaN(nav) || nav <= 0) continue;
      const dt = parseAmfiDate(dateStr ?? "");
      if (!dt) continue;
      rows.push({
        schemeCode: schemeCode.trim(),
        isinPayout: isinPayout && isinPayout !== "-" ? isinPayout.trim() : null,
        isinReinvest: isinReinvest && isinReinvest !== "-" ? isinReinvest.trim() : null,
        schemeName: schemeName.trim(),
        nav,
        date: dt,
        category,
        amc,
      });
    } else if (line.startsWith("Open Ended Schemes")) {
      category = line.replace(/^Open Ended Schemes\s*\(?/, "").replace(/\)$/, "").trim() || "Open Ended";
    } else if (/Mutual Fund$/.test(line)) {
      amc = line.trim();
    }
  }
  return rows;
}

function parseAmfiDate(s: string): Date | null {
  // Format: 22-Apr-2026
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const months: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const d = Number(m[1]);
  const mo = months[m[2]!];
  const y = Number(m[3]);
  if (mo === undefined) return null;
  return new Date(Date.UTC(y, mo, d));
}

export async function ingestAmfi(opts: { limit?: number } = {}): Promise<IngestResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const notes: string[] = [];

  let assetsUpserted = 0;
  let navsUpserted = 0;

  try {
    logger.info("amfi_fetch_start");
    const res = await fetch(AMFI_URL, { redirect: "follow" });
    if (!res.ok) throw new IngestError("amfi", `AMFI HTTP ${res.status}`);
    const text = await res.text();
    if (text.length < 50_000) throw new IngestError("amfi", `AMFI body unexpectedly small: ${text.length} bytes`);

    const all = parseAmfi(text);
    notes.push(`parsed ${all.length} rows from ${(text.length / 1024).toFixed(0)} KB`);
    const rows = opts.limit ? all.slice(0, opts.limit) : all;

    // Batch upserts in chunks to avoid pool exhaustion on Neon free tier.
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      // 1. Upsert assets first (we need asset.id to insert NAV)
      const assetResults = await Promise.all(
        slice.map((r) => {
          const subType = classifyMf(r.schemeName, r.category);
          return prisma.asset.upsert({
            where: { symbol: `MF_${r.schemeCode}` },
            update: {
              name: r.schemeName, sector: r.category, industry: r.amc, exchange: "AMFI",
              ...(subType ? { subType } : {}),
            },
            create: {
              symbol: `MF_${r.schemeCode}`,
              name: r.schemeName,
              type: "mf",
              sector: r.category,
              industry: r.amc,
              exchange: "AMFI",
              ...(subType ? { subType } : {}),
            },
            select: { id: true, symbol: true },
          });
        })
      );
      assetsUpserted += assetResults.length;

      // 2. Upsert NAVs (by composite key (assetId, ts))
      await Promise.all(
        slice.map((r, idx) => {
          const a = assetResults[idx]!;
          return prisma.mfNav.upsert({
            where: { assetId_ts: { assetId: a.id, ts: r.date } },
            update: { nav: r.nav },
            create: { assetId: a.id, ts: r.date, nav: r.nav },
          });
        })
      );
      navsUpserted += slice.length;
    }
  } catch (err) {
    logger.error({ err }, "amfi_ingest_failed");
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const finishedAt = new Date();
  const result: IngestResult = {
    source: "amfi",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    assetsUpserted,
    pricesUpserted: navsUpserted,
    errors,
    notes,
  };
  logger.info(result, "amfi_ingest_done");
  return result;
}
