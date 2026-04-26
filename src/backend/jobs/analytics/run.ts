import { runFeaturesForAllAssets, type FeaturesRunResult } from "./features";
import { runSignalsForFeatures, type SignalRunResult } from "./signals";
import { runRegime, type RegimeResult } from "./regime";
import { logger } from "@/backend/utils/logger.util";

export interface AnalyticsRunResult {
  asOf: string;
  features: FeaturesRunResult;
  signals: SignalRunResult;
  regime: RegimeResult | null;
  totalMs: number;
  errors: string[];
}

/**
 * Runs the full Phase D v0 pipeline for a given as-of date.
 * Features → Signals (using the in-memory features) → Regime.
 */
export async function runAnalytics(opts: { asOf?: Date } = {}): Promise<AnalyticsRunResult> {
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

  const result: AnalyticsRunResult = {
    asOf: asOf.toISOString(),
    features,
    signals,
    regime,
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
    totalMs: result.totalMs,
    errors: errors.length,
  }, "analytics_run_done");
  return result;
}
