"use client";
import { api } from "@/frontend/api/client";
import type { Asset } from "@/shared/types/asset.types";

export const signalsApi = {
  today: (type?: "BUY" | "HOLD" | "AVOID") =>
    api.get<{ data: Asset[] | { buys: Asset[]; holds: Asset[]; avoids: Asset[] } }>("/signals/today", { params: type ? { type } : {} }).then((r) => r.data.data),

  sectorStrength: () =>
    api.get<{ data: { sector: string; avgReturn: number; count: number; trend: "up" | "down" | "flat" }[] }>("/signals/sector-strength").then((r) => r.data.data),

  performance: () =>
    api.get<{ data: { windowDays: number; totals: Record<string, number>; avgProbability: Record<string, number>; uniqueDays: number; note: string } }>("/signals/performance").then((r) => r.data.data),

  history: (symbol: string) =>
    api.get<{ data: { date: string; signal: string; probability: number; confidence: number; rationale: string }[] }>(`/assets/${encodeURIComponent(symbol)}/signal-history`).then((r) => r.data.data),
};
