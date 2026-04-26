"use client";
import { api } from "@/frontend/api/client";
import type { Asset, MarketRegime, RiskState } from "@/shared/types/asset.types";

export interface DashboardSummary {
  asOf: string;
  regime: { regime: MarketRegime; risk: RiskState; confidence: number; rationale: string } | null;
  kpis: { label: string; value: string | number; delta?: { value: string; positive: boolean }; hint?: string }[];
  topBuys: Asset[];
  topAvoids: Asset[];
  sectorStrength: { sector: string; avgReturn: number; count: number; trend: "up" | "down" | "flat" }[];
  indexSeries: { date: string; price: number }[];
  allocation: { equity: number; debt: number; gold: number };
}

export const dashboardApi = {
  summary: () => api.get<{ data: DashboardSummary }>("/dashboard/summary").then((r) => r.data.data),
};
