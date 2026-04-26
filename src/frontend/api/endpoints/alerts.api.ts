"use client";
import { api } from "@/frontend/api/client";

export interface AlertDto {
  id: string;
  symbol: string;
  type: "signal_change" | "risk_flag" | "trend_reversal";
  threshold: string | null;
  channel: "in_app" | "email" | "both";
  active: boolean;
  createdAt: string;
}

export interface AlertEventDto {
  id: string;
  alertId: string;
  symbol: string;
  type: AlertDto["type"];
  channel: AlertDto["channel"];
  triggeredAt: string;
  payload: Record<string, unknown>;
}

export const alertsApi = {
  list: () => api.get<{ data: AlertDto[] }>("/alerts").then((r) => r.data.data),
  create: (input: { symbol: string; type: AlertDto["type"]; threshold?: string; channel?: AlertDto["channel"] }) =>
    api.post<{ data: AlertDto }>("/alerts", input).then((r) => r.data.data),
  update: (id: string, input: Partial<Pick<AlertDto, "threshold" | "channel" | "active">>) =>
    api.patch<{ data: AlertDto }>(`/alerts/${id}`, input).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/alerts/${id}`).then(() => null),

  events: (params?: { since?: string; limit?: number; alertId?: string }) =>
    api.get<{ data: AlertEventDto[]; meta: { total: number } }>("/alerts/events", { params }).then((r) => r.data),
};
