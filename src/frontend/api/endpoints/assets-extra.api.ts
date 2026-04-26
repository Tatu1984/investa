"use client";
import { api } from "@/frontend/api/client";

export const assetsExtraApi = {
  history: (symbol: string, range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" = "3M") =>
    api
      .get<{ data: { date: string; price: number; open?: number; high?: number; low?: number; volume?: number }[] }>(
        `/assets/${encodeURIComponent(symbol)}/history`,
        { params: { range } }
      )
      .then((r) => r.data.data),

  metrics: (symbol: string) =>
    api
      .get<{
        data: {
          return1m: number | null; return3m: number | null; return1y: number | null;
          volatility30d: number | null; maxDrawdown: number | null;
          ma20: number | null; ma50: number | null; ma200: number | null;
          rsi14: number | null; sharpe1y: number | null; dataPoints?: number; note?: string;
        };
      }>(`/assets/${encodeURIComponent(symbol)}/metrics`)
      .then((r) => r.data.data),

  corporateActions: (symbol: string) =>
    api
      .get<{ data: { date: string; type: string; ratio: string | null; amount: number | null; notes: string | null }[] }>(
        `/assets/${encodeURIComponent(symbol)}/corporate-actions`
      )
      .then((r) => r.data.data),

  search: (q: string, opts: { subType?: string[]; type?: string[]; limit?: number } = {}) =>
    api
      .get<{ data: { id: string; symbol: string; name: string; type: string; subType: string | null; sector: string | null; exchange: string | null }[] }>(
        "/assets/search",
        { params: { q, ...opts } }
      )
      .then((r) => r.data.data),

  compare: (symbols: string[], range: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" = "3M") =>
    api
      .post<{ data: { symbol: string; name: string; points: { date: string; pct: number; raw: number }[] }[] }>(
        "/assets/compare",
        { symbols, range }
      )
      .then((r) => r.data.data),
};
