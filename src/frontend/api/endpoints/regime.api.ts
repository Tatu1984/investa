"use client";
import { api } from "@/frontend/api/client";
import type { MarketRegime, RiskState } from "@/shared/types/asset.types";

export interface RegimeDto {
  date: string;
  regime: MarketRegime;
  risk: RiskState;
  confidence: number;
  rationale: string;
}

export const regimeApi = {
  current: () => api.get<{ data: RegimeDto }>("/regime/current").then((r) => r.data.data),
};
