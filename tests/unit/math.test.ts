import { describe, it, expect } from "vitest";
import {
  mean, stdev, median, pctReturn, returnNBars, dailyReturns, sma,
  annualisedVolFromDailyReturns, maxDrawdownPct, rsi, slopeLastN,
} from "../../src/backend/jobs/analytics/math";

describe("math.mean", () => {
  it("averages a non-empty array", () => expect(mean([1, 2, 3, 4])).toBe(2.5));
  it("returns null for empty", () => expect(mean([])).toBeNull());
});

describe("math.stdev", () => {
  it("returns 0 for identical values", () => expect(stdev([5, 5, 5])).toBe(0));
  it("returns null for <2 elements", () => expect(stdev([1])).toBeNull());
  it("computes population stdev (1,2,3,4,5)", () => expect(stdev([1, 2, 3, 4, 5])!).toBeCloseTo(Math.sqrt(2), 5));
});

describe("math.median", () => {
  it("odd length", () => expect(median([3, 1, 2])).toBe(2));
  it("even length", () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it("empty → null", () => expect(median([])).toBeNull());
});

describe("math.pctReturn", () => {
  it("up 10%", () => expect(pctReturn(100, 110)).toBeCloseTo(10, 6));
  it("down 25%", () => expect(pctReturn(100, 75)).toBeCloseTo(-25, 6));
  it("zero from", () => expect(pctReturn(0, 50)).toBeNull());
});

describe("math.returnNBars", () => {
  const series = [100, 101, 103, 105, 110];
  it("1-bar", () => expect(returnNBars(series, 1)!).toBeCloseTo(((110 - 105) / 105) * 100, 5));
  it("4-bar (full window)", () => expect(returnNBars(series, 4)!).toBeCloseTo(10, 5));
  it("not enough data", () => expect(returnNBars(series, 5)).toBeNull());
});

describe("math.dailyReturns", () => {
  it("returns N-1 values", () => {
    const r = dailyReturns([100, 110, 121]);
    expect(r).toHaveLength(2);
    expect(r[0]).toBeCloseTo(0.10, 5);
    expect(r[1]).toBeCloseTo(0.10, 5);
  });
  it("respects lookback window", () => {
    expect(dailyReturns([100, 105, 110, 115], 2)).toHaveLength(2);
  });
});

describe("math.sma", () => {
  it("k matches array length", () => expect(sma([1, 2, 3, 4, 5], 5)).toBe(3));
  it("k > length → null", () => expect(sma([1, 2], 5)).toBeNull());
  it("trailing window", () => expect(sma([1, 2, 3, 4, 5], 3)).toBe(4)); // mean of [3,4,5]
});

describe("math.annualisedVolFromDailyReturns", () => {
  it("0 vol when returns are constant", () => {
    expect(annualisedVolFromDailyReturns([0.01, 0.01, 0.01])).toBe(0);
  });
  it("scales by sqrt(252) and converts to %", () => {
    const v = annualisedVolFromDailyReturns([0.01, -0.01, 0.01, -0.01])!;
    // stdev of these 4 values is 0.01; ann = 0.01 * sqrt(252) * 100 ≈ 15.87
    expect(v).toBeGreaterThan(15);
    expect(v).toBeLessThan(17);
  });
  it("null with <2 returns", () => expect(annualisedVolFromDailyReturns([0.01])).toBeNull());
});

describe("math.maxDrawdownPct", () => {
  it("0 for monotonic up", () => expect(maxDrawdownPct([100, 110, 120])).toBe(0));
  it("classic 30% drawdown then recovery", () => {
    expect(maxDrawdownPct([100, 110, 77, 90])!).toBeCloseTo(-30, 5);
  });
});

describe("math.rsi", () => {
  it("returns 100 when only gains", () => {
    const monotonic = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi(monotonic, 14)).toBe(100);
  });
  it("returns null when not enough data", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
  it("ranges in [0,100] for mixed series", () => {
    const series = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const r = rsi(series, 14)!;
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});

describe("math.slopeLastN", () => {
  it("upward straight line slope ≈ 1", () => {
    const series = Array.from({ length: 50 }, (_, i) => i);
    expect(slopeLastN(series, 50)!).toBeCloseTo(1, 6);
  });
  it("flat line slope = 0", () => {
    expect(slopeLastN([5, 5, 5, 5, 5], 5)).toBe(0);
  });
});
