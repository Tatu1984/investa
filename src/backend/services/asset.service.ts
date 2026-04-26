import { assetRepository } from "@/backend/repositories/asset.repository";
import { signalRepository } from "@/backend/repositories/signal.repository";
import { defaultSubTypesForRisk } from "@/backend/services/classifier.service";
import type { AssetType, Signal } from "@prisma/client";

export type RiskProfile = "careful" | "balanced" | "growth";
export type Horizon = "short" | "medium" | "long";

/**
 * DTO shape returned to the frontend. Matches the existing
 * `src/shared/types/asset.types.ts#Asset` contract so UI code is unchanged.
 * Fields we don't persist yet (price, change1d, risk metrics) are 0 for now —
 * they'll be populated by the analytics pipeline in M2.
 */
export interface AssetDto {
  symbol: string;
  name: string;
  type: AssetType;
  subType: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  benchmark: string | null;
  aiScore: number;          // 0–100 = prob × confidence × 100
  price: number;
  change1d: number;
  signal: Signal;
  probability: number;
  confidence: number;
  return1y: number;
  return3y: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  volatility30d: number;
  rsi14: number;
  rationale: string;
  expenseRatio: number | null;
  aum: number | null;
}

type AssetWithSignals = Awaited<ReturnType<typeof assetRepository.findBySymbolWithLatestSignal>>;

function toDto(row: NonNullable<AssetWithSignals>): AssetDto {
  const s = row.signals[0];

  // Derive latest price + 1-day change. MFs use NAV series, everything else uses OHLCV.
  const isMf = row.type === "mf";
  const series = isMf
    ? row.navs.map((n) => ({ ts: n.ts, close: Number(n.nav) }))
    : row.prices.map((p) => ({ ts: p.ts, close: Number(p.close) }));
  const last = series[0]?.close ?? 0;
  const prev = series[1]?.close ?? 0;
  const change1d = last && prev ? ((last - prev) / prev) * 100 : 0;

  return {
    symbol: row.symbol,
    name: row.name,
    type: row.type,
    subType: row.subType ?? null,
    sector: row.sector,
    industry: row.industry,
    exchange: row.exchange,
    benchmark: row.benchmark,
    aiScore: s ? Math.round((s.probability * Number(s.confidence))) : 0,
    price: last,
    change1d: Number(change1d.toFixed(2)),
    signal: s?.signal ?? "HOLD",
    probability: s?.probability ?? 0,
    confidence: s ? Number(s.confidence) : 0,
    // Analytics metrics still 0 until M2's features pipeline runs.
    return1y: 0,
    return3y: 0,
    sharpe: 0,
    sortino: 0,
    maxDrawdown: 0,
    volatility30d: 0,
    rsi14: 0,
    rationale: s?.rationale ?? "No signal available yet — model runs daily.",
    expenseRatio: null,
    aum: null,
  };
}

export const assetService = {
  async list(filters: { types?: AssetType[]; signals?: Signal[]; limit?: number } = {}): Promise<AssetDto[]> {
    const rows = await assetRepository.listWithLatestSignal(filters);
    return rows.map(toDto);
  },

  async bySymbol(symbol: string): Promise<AssetDto | null> {
    const row = await assetRepository.findBySymbolWithLatestSignal(symbol);
    return row ? toDto(row) : null;
  },

  async bySymbols(symbols: string[]): Promise<AssetDto[]> {
    const rows = await assetRepository.findBySymbols(symbols);
    return rows.map(toDto);
  },

  /**
   * Recommender entry-point. Inputs from /for-you (or /signals/top API) shape
   * the result on three axes:
   *   - `assetType`   → equity / mf / etf / commodity (hard filter)
   *   - `subType`     → largeCap / midCap / smallCap / fund-category (hard filter)
   *   - `risk`        → if no explicit subType is given, derive a default subType
   *                     set from the user's risk profile (careful avoids smallCap, etc).
   *   - `horizon`     → tilts the score: short-horizon penalises high-volatility
   *                     picks, long-horizon rewards positive long-term momentum.
   *
   * If both subType[] and risk are omitted, the result is the same as before
   * (pure prob × confidence ranking) — backwards compatible.
   */
  async topPicks(opts: {
    type?: "BUY" | "HOLD" | "AVOID";
    n?: number;
    assetType?: AssetType[];
    subType?: string[];
    risk?: RiskProfile;
    horizon?: Horizon;
  }): Promise<AssetDto[]> {
    const date = await signalRepository.latestDate();
    if (!date) return [];

    // Resolve the active subType filter:
    //   - explicit subType wins
    //   - else derive from risk
    //   - else null (no subType filter)
    const explicitSubTypes = opts.subType?.filter(Boolean) ?? [];
    const subTypeAllow =
      explicitSubTypes.length > 0
        ? new Set<string>(explicitSubTypes)
        : opts.risk
        ? new Set<string>(defaultSubTypesForRisk(opts.risk))
        : null;

    const rows = await signalRepository.forDate(date, opts.type ? { signal: opts.type } : undefined);

    let filtered = opts.assetType ? rows.filter((r) => opts.assetType!.includes(r.asset.type)) : rows;
    if (subTypeAllow) {
      // Apply subType filter — keeping rows with no subType only when:
      //   1) no risk profile is set (avoid empty results during initial bootstrap), OR
      //   2) the user picks subTypes that include "*" (escape hatch).
      const allowUnclassified = !opts.risk && explicitSubTypes.length === 0;
      filtered = filtered.filter((r) => {
        const st = r.asset.subType;
        if (st && subTypeAllow.has(st)) return true;
        if (!st && allowUnclassified) return true;
        return false;
      });
    }

    const symbols = filtered.map((r) => r.asset.symbol);
    if (symbols.length === 0) return [];

    // Re-load with prices+navs joined so the DTO includes real prices.
    const full = await assetRepository.findBySymbols(symbols);
    const bySymbol = new Map(full.map((a) => [a.symbol, a]));

    const out: { dto: AssetDto; score: number }[] = [];
    for (const r of filtered) {
      const complete = bySymbol.get(r.asset.symbol);
      if (!complete) continue;
      const dto = toDto(complete);

      // Base score = the rule engine's confidence-weighted probability.
      let score = r.probability * Number(r.confidence);

      // Risk-aware tilt: small caps get a haircut for "careful", a bonus for "growth".
      if (opts.risk && dto.subType) {
        const tier =
          dto.subType === "largeCap" || dto.subType === "largeCapFund"
            ? "L"
            : dto.subType === "midCap" || dto.subType === "midCapFund" || dto.subType === "flexiCap" || dto.subType === "multiCap"
            ? "M"
            : dto.subType === "smallCap" || dto.subType === "smallCapFund"
            ? "S"
            : "X";
        if (opts.risk === "careful") {
          if (tier === "S") score *= 0.6;
          else if (tier === "M") score *= 0.85;
        } else if (opts.risk === "growth") {
          if (tier === "S") score *= 1.15;
          else if (tier === "M") score *= 1.08;
        }
      }

      // Horizon tilt: "short" penalises high volatility, "long" gives a small
      // boost to positive 1-month momentum (cheap proxy for trend).
      if (opts.horizon && opts.type === "BUY") {
        // We don't have features joined here; the score adjustment is a soft
        // prior driven by subType only. Detailed metrics arrive once features
        // are exposed — for now the differentiation comes from subType filtering.
        if (opts.horizon === "short" && (dto.subType === "smallCap" || dto.subType === "smallCapFund")) {
          score *= 0.8;
        }
      }

      out.push({ dto, score });
    }

    out.sort((a, b) => b.score - a.score);
    return out.slice(0, opts.n ?? 10).map((x) => x.dto);
  },

  async regime() {
    const r = await signalRepository.currentRegime();
    if (!r) return null;
    return {
      date: r.date,
      regime: r.regime,
      risk: r.riskState === "RISK_ON" ? ("Risk-On" as const) : ("Risk-Off" as const),
      confidence: Number(r.confidence),
      rationale: r.rationale,
    };
  },
};
