"use client";
import { api } from "@/frontend/api/client";
import type { Asset, Signal } from "@/shared/types/asset.types";

type ListResponse = { data: Asset[]; meta: { total: number } };
type DetailResponse = { data: Asset };

export interface TopPicksParams {
  type?: Signal;
  n?: number;
  assetType?: string[];
  subType?: string[];
  risk?: "careful" | "balanced" | "growth";
  horizon?: "short" | "medium" | "long";
}

export const assetsApi = {
  list: (params?: { type?: string[]; signal?: Signal[]; limit?: number }) =>
    api.get<ListResponse>("/assets", { params }).then((r) => r.data.data),

  bySymbol: (symbol: string) =>
    api.get<DetailResponse>(`/assets/${encodeURIComponent(symbol)}`).then((r) => r.data.data),

  top: (params: TopPicksParams = {}) =>
    api.get<ListResponse>("/signals/top", { params }).then((r) => r.data.data),
};
