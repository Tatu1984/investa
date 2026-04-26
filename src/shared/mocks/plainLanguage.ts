import type { Asset, Signal } from "@/shared/types/asset.types";
import type { Horizon, Risk } from "@/frontend/store/uiStore";

// Target split: [equity, debt, gold] percentages
const SPLITS: Record<Risk, Record<Horizon, [number, number, number]>> = {
  careful:  { short: [20, 70, 10], medium: [30, 60, 10], long: [40, 45, 15] },
  balanced: { short: [40, 45, 15], medium: [55, 30, 15], long: [70, 15, 15] },
  growth:   { short: [50, 35, 15], medium: [70, 15, 15], long: [85,  5, 10] },
};

export function allocationFor(risk: Risk, horizon: Horizon) {
  const [equity, debt, gold] = SPLITS[risk][horizon];
  return { equity, debt, gold };
}

export function horizonLabel(h: Horizon) {
  return h === "short" ? "Under 1 year" : h === "medium" ? "1 to 3 years" : "5 years or more";
}
export function horizonHoldFor(h: Horizon) {
  return h === "short" ? "Hold 6–12 months" : h === "medium" ? "Hold 1–3 years" : "Hold 5+ years";
}
export function riskLabel(r: Risk) {
  return r === "careful" ? "Careful" : r === "balanced" ? "Balanced" : "Growth-seeking";
}

// Plain-language confidence label for a signal.
export function plainSignalLabel(a: Asset) {
  if (a.signal === "AVOID") return { label: "Skip for now", tone: "avoid" as const };
  if (a.signal === "HOLD") return { label: "Wait and watch", tone: "hold" as const };
  if (a.probability >= 70 && a.confidence >= 0.75) return { label: "Strong pick", tone: "buy" as const };
  if (a.probability >= 60 && a.confidence >= 0.65) return { label: "Good pick", tone: "buy" as const };
  return { label: "Worth a look", tone: "buy" as const };
}

// Translate jargon rationale into a plain-English one-liner.
export function plainReason(a: Asset): string {
  const bits: string[] = [];
  const r = a.rationale.toLowerCase();
  if (r.includes("momentum") || r.includes("50d") || r.includes("200d") || r.includes("ma cross")) {
    bits.push("its price has been trending up nicely");
  }
  if (r.includes("rs") || r.includes("relative strength") || r.includes("top decile")) {
    bits.push("it's doing better than most similar investments");
  }
  if (r.includes("volatility") && (r.includes("below") || r.includes("low"))) {
    bits.push("recent price moves have been calm");
  }
  if (r.includes("consistency")) {
    bits.push("it has delivered steadily over time");
  }
  if (r.includes("downside")) {
    bits.push("it tends to fall less than others when markets drop");
  }
  if (r.includes("dividend") || r.includes("defensive")) {
    bits.push("it's a steady, defensive choice");
  }
  if (r.includes("safe-haven") || r.includes("risk-off")) {
    bits.push("people buy it when markets feel nervous — it's a safety cushion");
  }
  if (a.signal === "AVOID") {
    if (r.includes("volatility") && r.includes("high")) bits.push("price swings have been too wild recently");
    if (r.includes("break") || r.includes("weak")) bits.push("the trend has broken down");
    if (r.includes("drawdown")) bits.push("it has fallen hard and hasn't recovered");
  }
  if (bits.length === 0) {
    // Fallback: return a softened version of the original
    return a.rationale.replace(/>/g, "above").replace(/</g, "below");
  }
  return "Our model likes it because " + bits.slice(0, 2).join(", and ") + ".";
}

export function plainReasonAvoid(a: Asset): string {
  const r = a.rationale.toLowerCase();
  const bits: string[] = [];
  if (r.includes("volatility") && (r.includes("high") || r.includes(">"))) bits.push("price swings have been very wild");
  if (r.includes("weak") || r.includes("break")) bits.push("the trend has broken down");
  if (r.includes("drawdown")) bits.push("it has fallen hard from its peak");
  if (r.includes("below") && r.includes("200")) bits.push("it's trading below its long-term trend");
  if (r.includes("liquid")) bits.push("it can be hard to exit if you need to sell quickly");
  if (bits.length === 0) return "Our model flags it as risky right now.";
  return "Be careful because " + bits.slice(0, 2).join(" and ") + ".";
}

// Plain-English regime description.
export function plainRegime(regime: string, risk: string): { headline: string; body: string } {
  if (regime === "Bull") {
    return {
      headline: risk === "Risk-On" ? "Markets feel strong — people are buying." : "Markets are up but nervous.",
      body: "Good time to invest steadily, but don't chase anything that has already run up a lot.",
    };
  }
  if (regime === "Bear") {
    return {
      headline: "Markets feel weak — people are being cautious.",
      body: "Better to wait for things to stabilise, or buy only very high-quality assets in small amounts.",
    };
  }
  return {
    headline: risk === "Risk-On" ? "Markets are calm and mildly positive." : "Markets are calm but uncertain.",
    body: "A steady, balanced approach works best right now — avoid big bets in either direction.",
  };
}

// Pick a shortlist of BUYs inside a subset (by predicate), sorted by (probability × confidence).
export function pickTop(list: Asset[], predicate: (a: Asset) => boolean, n: number) {
  return list
    .filter((a) => a.signal === "BUY" && predicate(a))
    .sort((a, b) => (b.probability * b.confidence) - (a.probability * a.confidence))
    .slice(0, n);
}

export function pickAvoids(list: Asset[], n: number) {
  return list
    .filter((a) => a.signal === "AVOID")
    .sort((a, b) => (b.confidence) - (a.confidence))
    .slice(0, n);
}

export const inr = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
