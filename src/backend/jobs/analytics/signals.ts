import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import { median } from "./math";
import type { FeaturesRow } from "./features";
import type { Signal } from "@prisma/client";

const MODEL_VERSION = "rules-v0.1";

export interface SignalResult {
  assetId: string;
  date: Date;
  signal: Signal;
  probability: number;  // 0–100
  confidence: number;   // 0–1
  rationale: string;
  modelVersion: string;
}

/**
 * Evaluate the rule engine for one asset.
 *
 * BUY factors (each +1 weight):
 *   F1 Trend:     ma50 > ma200                   (classic golden-cross alignment)
 *   F2 Above:     lastClose > ma50                (price supported by short-term trend)
 *   F3 Above LT:  lastClose > ma200               (price above long-term trend)
 *   F4 Momentum:  ret1m > 0                       (1-month change positive)
 *   F5 RSI:       rsi14 in [40, 70]               (not oversold, not overbought)
 *   F6 Vol:       vol30d < crossSectionMedianVol  (calm — volatility below peer median)
 *
 * AVOID factors (each +1 weight, but on a NEGATIVE scale):
 *   B1 Breakdown: lastClose < ma200
 *   B2 Down 3M-ish (we only have ret1m/ret1w here): ret1m < -5
 *   B3 Volatile:  vol30d > 2 * crossSectionMedianVol
 *   B4 Drawdown:  maxDrawdown < -30
 *
 * Score:
 *   buyScore  = fired buy factors / 6
 *   avoidScore = fired avoid factors / 4
 *   net = buyScore - avoidScore in [-1, +1]
 *
 * Classification:
 *   net >= 0.5      → BUY    · probability = round(50 + net*40)   → 70..90
 *   net >= 0.25     → BUY    · probability = round(50 + net*40)   → 60..70
 *   net <= -0.5     → AVOID  · probability = round(50 + net*40)   → 10..30
 *   net <= -0.25    → AVOID  · probability = round(50 + net*40)   → 30..40
 *   else            → HOLD   · probability = 50
 *
 * Confidence:
 *   How many factors fired / total possible. In [0, 1].
 */
export function evaluateRules(f: FeaturesRow, xsVolMedian: number | null): SignalResult {
  const reasons: string[] = [];
  const cautions: string[] = [];

  // Buy factors
  let buy = 0;
  const maxBuy = 6;
  if (f.ma50 != null && f.ma200 != null && f.ma50 > f.ma200) { buy++; reasons.push("50D above 200D (trend up)"); }
  if (f.ma50 != null && f.lastClose > f.ma50) { buy++; reasons.push("price above 50D"); }
  if (f.ma200 != null && f.lastClose > f.ma200) { buy++; reasons.push("price above long-term trend"); }
  if (f.ret1m != null && f.ret1m > 0) { buy++; reasons.push(`up ${f.ret1m.toFixed(1)}% this month`); }
  if (f.rsi14 != null && f.rsi14 >= 40 && f.rsi14 <= 70) { buy++; reasons.push(`momentum balanced (RSI ${f.rsi14.toFixed(0)})`); }
  if (f.vol30d != null && xsVolMedian != null && f.vol30d < xsVolMedian) { buy++; reasons.push("recent price moves calmer than peers"); }

  // Avoid factors
  let avoid = 0;
  const maxAvoid = 4;
  if (f.ma200 != null && f.lastClose < f.ma200) { avoid++; cautions.push("price below long-term trend"); }
  if (f.ret1m != null && f.ret1m < -5) { avoid++; cautions.push(`down ${Math.abs(f.ret1m).toFixed(1)}% this month`); }
  if (f.vol30d != null && xsVolMedian != null && f.vol30d > 2 * xsVolMedian) { avoid++; cautions.push("price swings well above peers"); }
  if (f.maxDrawdown != null && f.maxDrawdown < -30) { avoid++; cautions.push(`fallen ${Math.abs(f.maxDrawdown).toFixed(0)}% from peak`); }

  const buyScore = buy / maxBuy;
  const avoidScore = avoid / maxAvoid;
  const net = buyScore - avoidScore;
  const factorsFired = buy + avoid;

  let signal: Signal;
  let probability: number;
  let rationale: string;

  if (net >= 0.25) {
    signal = "BUY";
    probability = Math.max(55, Math.min(90, Math.round(50 + net * 40)));
    rationale = "Our model likes it because " + (reasons.slice(0, 3).join(", ") || "multiple factors lined up") + ".";
  } else if (net <= -0.25) {
    signal = "AVOID";
    probability = Math.max(10, Math.min(45, Math.round(50 + net * 40)));
    rationale = "Be careful because " + (cautions.slice(0, 3).join(", ") || "multiple warning signs lined up") + ".";
  } else {
    signal = "HOLD";
    probability = 50;
    const bits: string[] = [];
    if (reasons.length) bits.push("some positives (" + reasons.slice(0, 2).join("; ") + ")");
    if (cautions.length) bits.push("some negatives (" + cautions.slice(0, 2).join("; ") + ")");
    rationale = bits.length ? "Mixed signal: " + bits.join(" and ") + "." : "Not enough edge in either direction right now.";
  }

  // Confidence = fraction of factors evaluable that fired.
  // If we only had 2 features available and both fired, that's conf=1.0 on weak evidence, so also weight by data completeness.
  const completeness = Math.min(1, f.dataPoints / 252); // favor assets with ≥1 year of data
  const firedShare = factorsFired / (maxBuy + maxAvoid);
  const confidence = Math.round(Math.max(0.05, Math.min(0.95, completeness * (0.3 + firedShare))) * 1000) / 1000;

  return {
    assetId: f.assetId,
    date: f.date,
    signal,
    probability,
    confidence,
    rationale,
    modelVersion: MODEL_VERSION,
  };
}

export interface SignalRunResult {
  asOf: string;
  evaluated: number;
  written: number;
  counts: { BUY: number; HOLD: number; AVOID: number };
  durationMs: number;
  errors: string[];
}

export async function runSignalsForFeatures(rows: FeaturesRow[], asOf: Date): Promise<SignalRunResult> {
  const started = Date.now();
  const errors: string[] = [];

  // Cross-sectional median vol — used for "calmer than peers" / "swings above peers" rules.
  const vols = rows.map((r) => r.vol30d).filter((v): v is number => v != null && Number.isFinite(v));
  const xsVolMedian = median(vols);

  const counts = { BUY: 0, HOLD: 0, AVOID: 0 };
  const CHUNK = 100;
  let written = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const ops = slice.map((f) => {
      const s = evaluateRules(f, xsVolMedian);
      counts[s.signal]++;
      return prisma.signalsDaily.upsert({
        where: { assetId_date: { assetId: s.assetId, date: asOf } },
        update: { signal: s.signal, probability: s.probability, confidence: s.confidence, rationale: s.rationale, modelVersion: s.modelVersion },
        create: { assetId: s.assetId, date: asOf, signal: s.signal, probability: s.probability, confidence: s.confidence, rationale: s.rationale, modelVersion: s.modelVersion },
      });
    });
    try {
      await Promise.all(ops);
      written += slice.length;
    } catch (err) {
      errors.push(`batch at ${i}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const result: SignalRunResult = {
    asOf: asOf.toISOString(),
    evaluated: rows.length,
    written,
    counts,
    durationMs: Date.now() - started,
    errors,
  };
  logger.info(result, "signals_run_done");
  return result;
}
