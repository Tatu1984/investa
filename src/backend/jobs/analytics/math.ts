/**
 * Pure math helpers for feature engineering.
 * No DB, no I/O, no side-effects — easy to unit-test.
 * All series are ordered ascending by date; `series[series.length-1]` is the latest close.
 */

/** Arithmetic mean. Returns null for empty input. */
export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. Returns null for <2 elements. */
export function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

/** Median. Returns null for empty input. */
export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/** Simple return between two price points, in percent. */
export function pctReturn(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return null;
  return ((to - from) / from) * 100;
}

/** Return between the N-th last close and the latest close, in percent. */
export function returnNBars(series: number[], n: number): number | null {
  if (series.length <= n) return null;
  const from = series[series.length - 1 - n];
  const to = series[series.length - 1];
  if (from == null || to == null) return null;
  return pctReturn(from, to);
}

/** Daily simple returns over the last `lookback+1` prices. */
export function dailyReturns(series: number[], lookback?: number): number[] {
  const end = series.length;
  const start = lookback != null ? Math.max(1, end - lookback) : 1;
  const out: number[] = [];
  for (let i = start; i < end; i++) {
    const a = series[i - 1]!;
    const b = series[i]!;
    if (a > 0) out.push((b - a) / a);
  }
  return out;
}

/** Simple moving average of the last `k` bars. */
export function sma(series: number[], k: number): number | null {
  if (series.length < k || k <= 0) return null;
  return mean(series.slice(-k));
}

/**
 * Annualised volatility (%) from 30-day daily returns.
 * Assumes 252 trading days/year.
 */
export function annualisedVolFromDailyReturns(rets: number[]): number | null {
  if (rets.length < 2) return null;
  const sd = stdev(rets);
  if (sd == null) return null;
  return sd * Math.sqrt(252) * 100;
}

/** Max drawdown across the full series, as a negative percent (e.g. -18.2). */
export function maxDrawdownPct(series: number[]): number | null {
  if (series.length < 2) return null;
  let peak = series[0]!;
  let mdd = 0;
  for (const p of series) {
    if (p > peak) peak = p;
    mdd = Math.min(mdd, (p - peak) / peak);
  }
  return mdd * 100;
}

/**
 * RSI using Wilder's smoothing over a `period`-day window (default 14).
 * Returns a number in [0, 100] or null if not enough data.
 */
export function rsi(series: number[], period = 14): number | null {
  if (series.length <= period) return null;
  let gains = 0;
  let losses = 0;
  // seed with first `period` diffs
  for (let i = 1; i <= period; i++) {
    const d = series[i]! - series[i - 1]!;
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgG = gains / period;
  let avgL = losses / period;
  for (let i = period + 1; i < series.length; i++) {
    const d = series[i]! - series[i - 1]!;
    const g = d >= 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
  }
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

/** Slope of a best-fit line through the last `k` closes (units: price per bar). */
export function slopeLastN(series: number[], k: number): number | null {
  if (series.length < k) return null;
  const ys = series.slice(-k);
  const n = ys.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += ys[i]!;
    sumXY += i * ys[i]!;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}
