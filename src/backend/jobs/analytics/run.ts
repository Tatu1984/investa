import { runFeaturesForAllAssets, type FeaturesRunResult } from "./features";
import { runSignalsForFeatures, type SignalRunResult } from "./signals";
import { runRegime, type RegimeResult } from "./regime";
import { narrateAndPersist, type NarrateBatchResult } from "@/backend/services/narration.service";
import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { Signal } from "@prisma/client";

export interface AnalyticsRunResult {
  asOf: string;
  features: FeaturesRunResult;
  signals: SignalRunResult;
  regime: RegimeResult | null;
  narration: NarrateBatchResult | null;
  totalMs: number;
  errors: string[];
}

interface NarrateOpts {
  /** How many top BUYs / HOLDs / AVOIDs to narrate per asset type. Defaults to 8. */
  perBucket?: number;
  /** Cap total narration calls (across all buckets) per run. Default 60. */
  hardCap?: number;
  /** Disable narration for this run (e.g., backfill jobs). Default false. */
  skip?: boolean;
}

/**
 * Pulls the top N signals per (assetType, signal) combination from the freshly-written
 * signals_daily, joined with features_daily and asset metadata. These are the picks
 * /for-you actually shows, so they're the only ones worth narrating.
 */
async function pickSignalsToNarrate(asOf: Date, perBucket: number, hardCap: number) {
  const buckets: Array<{ assetType: "equity" | "mf" | "etf" | "index" | "commodity" | "currency"; signal: Signal; n: number }> = [
    { assetType: "equity", signal: "BUY", n: perBucket },
    { assetType: "equity", signal: "AVOID", n: perBucket },
    { assetType: "mf",     signal: "BUY", n: perBucket },
    { assetType: "mf",     signal: "AVOID", n: perBucket },
    { assetType: "etf",    signal: "BUY", n: 3 },
    { assetType: "index",  signal: "BUY", n: 3 },
    { assetType: "commodity", signal: "BUY", n: 2 },
  ];

  const out: Awaited<ReturnType<typeof loadOne>>[number][] = [];
  for (const b of buckets) {
    if (out.length >= hardCap) break;
    const slice = await loadOne(asOf, b.assetType, b.signal, Math.min(b.n, hardCap - out.length));
    out.push(...slice);
  }
  return out;
}

async function loadOne(asOf: Date, assetType: string, signal: Signal, n: number) {
  if (n <= 0) return [];
  const rows = await prisma.signalsDaily.findMany({
    where: { date: asOf, signal, asset: { type: assetType as never } },
    orderBy: [{ confidence: "desc" }, { probability: "desc" }],
    take: n,
    include: {
      asset: { select: { symbol: true, name: true, type: true, sector: true } },
    },
  });
  // Pull features in one round-trip
  const assetIds = rows.map((r) => r.assetId);
  const featuresRows = await prisma.featuresDaily.findMany({
    where: { date: asOf, assetId: { in: assetIds } },
  });
  const featuresByAssetId = new Map(featuresRows.map((f) => [f.assetId, f]));

  return rows.map((r) => {
    const f = featuresByAssetId.get(r.assetId);
    return {
      symbol: r.asset.symbol,
      name: r.asset.name,
      type: r.asset.type,
      sector: r.asset.sector,
      signal: r.signal,
      probability: r.probability,
      confidence: Number(r.confidence),
      features: {
        // lastClose: the rule engine doesn't persist this — read from prices/navs is heavier;
        // for narration we approximate with the latest MA20 if present, else 0. Claude is told
        // to use the OTHER features anyway.
        lastClose: f?.ma20 != null ? Number(f.ma20) : 0,
        ret1m: f?.ret1m != null ? Number(f.ret1m) : null,
        vol30d: f?.vol30d != null ? Number(f.vol30d) : null,
        maxDrawdown: f?.maxDrawdown != null ? Number(f.maxDrawdown) : null,
        rsi14: f?.rsi14 != null ? Number(f.rsi14) : null,
        ma50: f?.ma50 != null ? Number(f.ma50) : null,
        ma200: f?.ma200 != null ? Number(f.ma200) : null,
        dataPoints: 0,  // not persisted in features_daily — narration will mention if missing
      },
      ruleRationale: r.rationale,
    };
  });
}

/**
 * Runs the full Phase D v0 pipeline for a given as-of date.
 * Features → Signals (using the in-memory features) → Regime → LLM narration of top picks.
 */
export async function runAnalytics(opts: { asOf?: Date; narrate?: NarrateOpts } = {}): Promise<AnalyticsRunResult> {
  const started = Date.now();
  const asOf = opts.asOf ?? (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
  const errors: string[] = [];

  logger.info({ asOf: asOf.toISOString() }, "analytics_run_start");

  const { result: features, rows } = await runFeaturesForAllAssets(asOf);
  errors.push(...features.errors);

  const signals = await runSignalsForFeatures(rows, asOf);
  errors.push(...signals.errors);

  const regime = await runRegime(asOf).catch((err) => {
    errors.push(`regime: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  });

  // OPTIONAL: LLM narration of top picks. Env-guarded — skips silently if
  // ANTHROPIC_API_KEY isn't set or daily budget exhausted.
  let narration: NarrateBatchResult | null = null;
  if (!opts.narrate?.skip && signals.written > 0) {
    try {
      const perBucket = opts.narrate?.perBucket ?? 8;
      const hardCap = opts.narrate?.hardCap ?? 60;
      const toNarrate = await pickSignalsToNarrate(asOf, perBucket, hardCap);
      const regimeForLlm = regime
        ? { regime: regime.regime, riskState: regime.riskState, confidence: regime.confidence, rationale: regime.rationale, date: regime.date }
        : null;
      narration = await narrateAndPersist(toNarrate, regimeForLlm, asOf);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`narration: ${msg}`);
    }
  }

  const result: AnalyticsRunResult = {
    asOf: asOf.toISOString(),
    features,
    signals,
    regime,
    narration,
    totalMs: Date.now() - started,
    errors,
  };
  logger.info({
    asOf: result.asOf,
    featuresWritten: features.featuresWritten,
    signalsWritten: signals.written,
    signalCounts: signals.counts,
    regime: regime?.regime,
    riskState: regime?.riskState,
    narrated: narration?.narrated ?? 0,
    narrationCostUsd: narration?.costUsd ?? 0,
    totalMs: result.totalMs,
    errors: errors.length,
  }, "analytics_run_done");
  return result;
}
