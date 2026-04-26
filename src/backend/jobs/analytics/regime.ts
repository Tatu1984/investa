import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { Regime, RiskState } from "@prisma/client";
import { annualisedVolFromDailyReturns, dailyReturns, returnNBars, sma, slopeLastN } from "./math";

export interface RegimeResult {
  date: Date;
  regime: Regime;
  riskState: RiskState;
  confidence: number;
  rationale: string;
}

/**
 * Rule-based regime detector. Uses NIFTY 50 daily closes.
 *
 *   Bull   : close > MA200 AND 200-bar slope > 0 AND 1M-return > 2%
 *   Bear   : close < MA200 AND 200-bar slope < 0 AND 1M-return < -3%
 *   Sideways otherwise
 *
 * Risk-on  : 30D vol < 20%  AND  regime ∈ {Bull, Sideways}
 * Risk-off : everything else
 */
export async function detectRegime(asOf: Date): Promise<RegimeResult | null> {
  const nifty = await prisma.asset.findUnique({ where: { symbol: "NIFTY50" } });
  if (!nifty) return null;

  const prices = await prisma.assetPrice.findMany({
    where: { assetId: nifty.id },
    orderBy: { ts: "asc" },
    select: { close: true },
  });
  const series = prices.map((p) => Number(p.close));
  if (series.length < 5) return null;

  const last = series[series.length - 1]!;
  const ma200 = sma(series, 200);
  const ret1m = returnNBars(series, 21);
  const slope200 = slopeLastN(series, Math.min(200, series.length));
  const vol30 = annualisedVolFromDailyReturns(dailyReturns(series, 30));

  // Regime decision
  let regime: Regime = "Sideways";
  let regimeReason = "";
  if (ma200 != null && slope200 != null && ret1m != null) {
    if (last > ma200 && slope200 > 0 && ret1m > 2) { regime = "Bull";  regimeReason = `above 200D, rising slope, +${ret1m.toFixed(1)}% 1M`; }
    else if (last < ma200 && slope200 < 0 && ret1m < -3) { regime = "Bear"; regimeReason = `below 200D, falling slope, ${ret1m.toFixed(1)}% 1M`; }
    else regimeReason = `${last > (ma200 ?? 0) ? "above" : "below"} 200D, 1M ${ret1m.toFixed(1)}%, slope ${slope200.toExponential(1)}`;
  } else {
    regimeReason = `short history (${series.length} bars) — defaulting to sideways`;
  }

  // Risk state
  const riskOn = vol30 != null && vol30 < 20 && regime !== "Bear";
  const riskState: RiskState = riskOn ? "RISK_ON" : "RISK_OFF";

  // Confidence — proportional to how many inputs we have AND how strong the signals are.
  const dataScore = Math.min(1, series.length / 200);
  const signalScore = Math.min(1, Math.abs(ret1m ?? 0) / 10);
  const volScore = vol30 == null ? 0.3 : 1 - Math.min(1, Math.abs((vol30 ?? 20) - 15) / 30);
  const confidence = Math.max(0.2, Math.min(0.95, (dataScore + signalScore + volScore) / 3));

  const volBit = vol30 != null ? `VIX-like vol ${vol30.toFixed(1)}%` : "vol n/a";
  const rationale = `NIFTY 50 is ${regimeReason}. ${volBit}. ${riskOn ? "Low-volatility backdrop." : "Caution mode."}`;

  return {
    date: asOf,
    regime,
    riskState,
    confidence: Math.round(confidence * 1000) / 1000,
    rationale,
  };
}

export async function runRegime(asOf: Date): Promise<RegimeResult | null> {
  const r = await detectRegime(asOf);
  if (!r) return null;
  await prisma.marketRegime.upsert({
    where: { date: asOf },
    update: { regime: r.regime, riskState: r.riskState, confidence: r.confidence, rationale: r.rationale },
    create: { date: asOf, regime: r.regime, riskState: r.riskState, confidence: r.confidence, rationale: r.rationale },
  });
  logger.info({ asOf: asOf.toISOString(), regime: r.regime, riskState: r.riskState, confidence: r.confidence }, "regime_run_done");
  return r;
}
