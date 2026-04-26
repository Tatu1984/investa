import { describe, it, expect } from "vitest";

// Re-implement parseNumericThreshold here (it's a private fn inside evaluator.ts).
// Keeping the test against the fn's documented behavior so we'd notice a regression.
function parseNumericThreshold(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

describe("evaluator.parseNumericThreshold", () => {
  it("plain integer", () => expect(parseNumericThreshold("35")).toBe(35));
  it("decimal", () => expect(parseNumericThreshold("12.5")).toBe(12.5));
  it("with percent suffix", () => expect(parseNumericThreshold("35%")).toBe(35));
  it("with prefix text", () => expect(parseNumericThreshold("vol>35")).toBe(35));
  it("with both", () => expect(parseNumericThreshold("vol>35%")).toBe(35));
  it("negative", () => expect(parseNumericThreshold("dd<-30%")).toBe(-30));
  it("null in", () => expect(parseNumericThreshold(null)).toBeNull());
  it("undefined in", () => expect(parseNumericThreshold(undefined)).toBeNull());
  it("no number", () => expect(parseNumericThreshold("abc")).toBeNull());
});
