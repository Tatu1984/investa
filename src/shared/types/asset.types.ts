export type AssetType = "equity" | "mf" | "etf" | "index" | "commodity" | "currency";
export type Signal = "BUY" | "HOLD" | "AVOID";
export type MarketRegime = "Bull" | "Bear" | "Sideways";
export type RiskState = "Risk-On" | "Risk-Off";

export type AssetSubType =
  | "largeCap" | "midCap" | "smallCap"
  | "largeCapFund" | "midCapFund" | "smallCapFund" | "flexiCap" | "multiCap" | "elss"
  | "indexFund" | "debtFund" | "liquidFund" | "hybrid"
  | "gold" | "international" | "sector";

export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
  subType?: AssetSubType | null;
  sector?: string;
  industry?: string;
  exchange?: string;
  benchmark?: string;
  aiScore: number;        // 0-100
  price: number;
  change1d: number;       // %
  signal: Signal;
  probability: number;    // 0-100
  confidence: number;     // 0-1
  return1y: number;       // %
  return3y: number;       // %
  sharpe: number;
  sortino: number;
  maxDrawdown: number;    // negative %
  volatility30d: number;  // %
  rsi14: number;
  rationale: string;
  expenseRatio?: number;
  aum?: number;           // crore
}

export interface SignalEvent {
  date: string;
  signal: Signal;
  probability: number;
  confidence: number;
  rationale: string;
  fwd1m?: number;
  fwd3m?: number;
}

export interface CorporateAction {
  date: string;
  type: "split" | "dividend" | "bonus";
  detail: string;
}

export interface DailyReport {
  date: string;
  title: string;
  summary: string;
  sections: {
    marketOverview: string;
    keySignals: string;
    topOpportunities: string;
    avoidList: string;
    sectorView: string;
    allocation: string;
  };
}

export interface Alert {
  id: string;
  symbol: string;
  type: "signal_change" | "risk_flag" | "trend_reversal";
  threshold?: string;
  channel: "in_app" | "email" | "both";
  active: boolean;
  createdAt: string;
}
