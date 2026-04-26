import { assetRepository } from "@/backend/repositories/asset.repository";
import { signalRepository } from "@/backend/repositories/signal.repository";
import type { AssetType, Signal } from "@prisma/client";

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

  async topPicks(opts: { type?: "BUY" | "HOLD" | "AVOID"; n?: number; assetType?: AssetType[] }): Promise<AssetDto[]> {
    const date = await signalRepository.latestDate();
    if (!date) return [];
    const rows = await signalRepository.forDate(date, opts.type ? { signal: opts.type } : undefined);
    const filtered = opts.assetType ? rows.filter((r) => opts.assetType!.includes(r.asset.type)) : rows;
    const symbols = filtered.map((r) => r.asset.symbol);
    if (symbols.length === 0) return [];
    // Re-load with prices+navs joined so the DTO includes real prices.
    const full = await assetRepository.findBySymbols(symbols);
    const bySymbol = new Map(full.map((a) => [a.symbol, a]));
    const out: AssetDto[] = [];
    for (const r of filtered) {
      const complete = bySymbol.get(r.asset.symbol);
      if (complete) out.push(toDto(complete));
    }
    return out.slice(0, opts.n ?? 10);
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
