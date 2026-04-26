import { describe, it, expect } from "vitest";
import { evaluateRules } from "../../src/backend/jobs/analytics/signals";
import type { FeaturesRow } from "../../src/backend/jobs/analytics/features";

const baseDate = new Date("2026-04-24T00:00:00Z");

function row(overrides: Partial<FeaturesRow> = {}): FeaturesRow {
  return {
    assetId: "a1",
    date: baseDate,
    ret1d: 0, ret1w: 0, ret1m: 0, ret1y: 0, ret3y: 0,
    vol30d: 15, maxDrawdown: -5,
    ma20: 100, ma50: 100, ma200: 100,
    rsi14: 50,
    lastClose: 100, dataPoints: 252,
    ...overrides,
  };
}

describe("rule engine — BUY path", () => {
  it("fires BUY when momentum + trend + RSI + vol all align", () => {
    const f = row({ ma50: 110, ma200: 100, lastClose: 115, ret1m: 8, rsi14: 55, vol30d: 10 });
    const s = evaluateRules(f, 20); // peer median vol = 20%
    expect(s.signal).toBe("BUY");
    expect(s.probability).toBeGreaterThanOrEqual(60);
    expect(s.probability).toBeLessThanOrEqual(90);
    expect(s.rationale).toContain("Our model likes it");
  });

  it("higher net score → higher probability", () => {
    const weak = evaluateRules(row({ ma50: 101, ma200: 100, lastClose: 101, ret1m: 1, rsi14: 50, vol30d: 18 }), 20);
    const strong = evaluateRules(row({ ma50: 120, ma200: 100, lastClose: 130, ret1m: 12, rsi14: 60, vol30d: 8 }), 20);
    expect(strong.probability).toBeGreaterThanOrEqual(weak.probability);
  });
});

describe("rule engine — AVOID path", () => {
  it("fires AVOID when below 200D + falling + volatile + drawdown", () => {
    const f = row({ ma50: 90, ma200: 100, lastClose: 80, ret1m: -10, vol30d: 50, maxDrawdown: -40 });
    const s = evaluateRules(f, 20);
    expect(s.signal).toBe("AVOID");
    expect(s.probability).toBeLessThanOrEqual(45);
    expect(s.rationale).toContain("Be careful");
  });
});

describe("rule engine — HOLD path", () => {
  it("fires HOLD on mixed signals (some +ve, some -ve, net inside ±0.25)", () => {
    // ma50 < ma200 (no F1), price < ma50 (no F2), price < ma200 (no F3 + fires B1),
    // ret1m positive (F4), RSI balanced (F5), vol > peer median (no F6, no B3),
    // dd small (no B4)
    // → buy = 2/6 = 0.333,  avoid = 1/4 = 0.25,  net = 0.083 → HOLD
    const f = row({ ma50: 99, ma200: 100, lastClose: 99, ret1m: 2, rsi14: 50, vol30d: 22 });
    const s = evaluateRules(f, 20);
    expect(s.signal).toBe("HOLD");
    expect(s.probability).toBe(50);
  });
});

describe("rule engine — confidence", () => {
  it("low confidence with little data", () => {
    const s = evaluateRules(row({ dataPoints: 10, ma50: 110, ma200: 100, lastClose: 115, ret1m: 8, rsi14: 55, vol30d: 10 }), 20);
    expect(s.confidence).toBeLessThan(0.2);
  });
  it("higher confidence with full year of data", () => {
    const s = evaluateRules(row({ dataPoints: 365, ma50: 110, ma200: 100, lastClose: 115, ret1m: 8, rsi14: 55, vol30d: 10 }), 20);
    expect(s.confidence).toBeGreaterThan(0.5);
  });
});

describe("rule engine — model version", () => {
  it("tags every result with rules-v0.1", () => {
    const s = evaluateRules(row(), 20);
    expect(s.modelVersion).toBe("rules-v0.1");
  });
});
